import {
  GPUCurtains,
  Texture,
  RenderTexture,
  ShaderPass,
  BufferBinding,
  TextureBindGroup,
  ComputePass,
  Plane,
} from '../../dist/gpu-curtains.js'

// Port of https://webgpu.github.io/webgpu-samples/samples/imageBlur

// This shader blurs the input texture in one direction, depending on whether
// |flip.value| is 0 or 1.
// It does so by running (128 / 4) threads per workgroup to load 128
// texels into 4 rows of shared memory. Each thread loads a
// 4 x 4 block of texels to take advantage of the texture sampling
// hardware.
// Then, each thread computes the blur result by averaging the adjacent texel values
// in shared memory.
// Because we're operating on a subset of the texture, we cannot compute all of the
// results since not all of the neighbors are available in shared memory.
// Specifically, with 128 x 128 tiles, we can only compute and write out
// square blocks of size 128 - (filterSize - 1). We compute the number of blocks
// needed in Javascript and dispatch that amount.
const computeBlur = `
var<workgroup> tile : array<array<vec4<f32>, 128>, 4>;

@compute @workgroup_size(32, 1, 1)
fn main(
  @builtin(workgroup_id) WorkGroupID : vec3<u32>,
  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>
) {
  let filterOffset = (params.filterDim - 1) / 2;
  let dims = vec2<i32>(textureDimensions(inputTexture, 0));

  let baseIndex = vec2<i32>(WorkGroupID.xy * vec2(params.blockDim, 4)
                  + LocalInvocationID.xy * vec2(4, 1))
                  - vec2(filterOffset, 0);

  for (var r = 0; r < 4; r++) {
    for (var c = 0; c < 4; c++) {
      var loadIndex = baseIndex + vec2(c, r);
      if (direction.flip != 0u) {
        loadIndex = loadIndex.yx;
      }

      tile[r][4 * LocalInvocationID.x + u32(c)] = textureSampleLevel(
        inputTexture,
        defaultSampler,
        (vec2<f32>(loadIndex) + vec2<f32>(0.25, 0.25)) / vec2<f32>(dims),
        0.0
      );
    }
  }

  workgroupBarrier();

  for (var r = 0; r < 4; r++) {
    for (var c = 0; c < 4; c++) {
      var writeIndex = baseIndex + vec2(c, r);
      if (direction.flip != 0) {
        writeIndex = writeIndex.yx;
      }
      
      let center = i32(4 * LocalInvocationID.x) + c;
      if (center >= filterOffset &&
          center < 128 - filterOffset &&
          all(writeIndex < dims)) {
        var acc = vec4(0.0, 0.0, 0.0, 0.0);
        for (var f = 0; f < params.filterDim; f++) {
          var i = center + f - filterOffset;
          acc = acc + (1.0 / f32(params.filterDim)) * tile[r][i];
        }
        textureStore(outputTexture, writeIndex, acc);
      }
    }
  }
  
}
`

window.addEventListener('load', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  // first add all our planes
  const planeVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
      
      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);
    
      return vsOutput;
    }
  `

  const planeFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
                    
      return color;
    }
  `

  const params = {
    shaders: {
      vertex: {
        code: planeVs,
        entryPoint: 'main',
      },
      fragment: {
        code: planeFs,
        entryPoint: 'main',
      },
    },
  }

  const planeEls = document.querySelectorAll('.plane')
  planeEls.forEach((planeEl, index) => {
    params.label = 'Plane ' + index
    const plane = new Plane(gpuCurtains, planeEl, params)
  })

  // now create the post processing pass
  const tileDimension = 128
  const filterSize = 15
  const blockDimension = tileDimension - (filterSize - 1)
  const blurIterations = 2
  const batchSize = 4
  const format = 'rgba8unorm'

  const blurPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(blurredTexture, defaultSampler, fsInput.uv);
      var original: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      //color.a = original.a;
                    
      return color;
    }
  `

  const blurredTexture = new RenderTexture(gpuCurtains, {
    label: 'Blur render texture',
    name: 'blurredTexture',
    format,
  })

  const shaderPass = new ShaderPass(gpuCurtains, {
    shaders: {
      fragment: {
        code: blurPassFs,
      },
    },
    textures: [blurredTexture],
  })

  // this is another way to do it
  // const blurredTexture = shaderPass.createRenderTexture({
  //   label: 'Blur render texture',
  //   name: 'blurredTexture',
  //   format,
  // })

  console.log(shaderPass)

  const inputTexture = new RenderTexture(gpuCurtains, {
    label: 'Compute input texture',
    name: 'inputTexture',
    format,
    fromTexture: shaderPass.renderTexture,
  })

  const tempTexture = new RenderTexture(gpuCurtains, {
    label: 'Compute temp texture',
    name: 'outputTexture',
    usage: 'storageTexture',
    format,
    size: inputTexture.size,
  })

  const outputTexture = new RenderTexture(gpuCurtains, {
    label: 'Compute output texture',
    name: 'outputTexture',
    usage: 'storageTexture',
    format,
    size: inputTexture.size,
  })

  // last but not least, tell our blurred texture that we want to use the compute blur output as source
  blurredTexture.copy(outputTexture)

  // create 2 uniforms bindings
  const flipBinding0 = new BufferBinding({
    label: 'Direction',
    name: 'direction',
    bindingType: 'uniform',
    visibility: 'compute',
    struct: {
      flip: {
        type: 'u32',
        value: 0,
      },
    },
  })

  const flipBinding1 = new BufferBinding({
    label: 'Direction',
    name: 'direction',
    bindingType: 'uniform',
    visibility: 'compute',
    struct: {
      flip: {
        type: 'u32',
        value: 1,
      },
    },
  })

  const textureBindGroup = new TextureBindGroup(gpuCurtains.renderer, {
    label: 'Compute blur texture bind group 1',
    textures: [inputTexture, tempTexture],
    bindings: [flipBinding0],
  })

  // create bind group & its layout
  textureBindGroup.createBindGroup()

  const outputTextureBindGroup1 = textureBindGroup.clone({
    // bindings as [flip direction, input texture, output texture]
    bindings: [flipBinding1, tempTexture.textureBinding, outputTexture.textureBinding],
    keepLayout: true, // allows for bind groups ping pong
  })

  const outputTextureBindGroup2 = textureBindGroup.clone({
    // bindings as [flip direction, input texture, output texture]
    bindings: [flipBinding0, outputTexture.textureBinding, tempTexture.textureBinding],
    keepLayout: true, // allows for bind groups ping pong
  })

  console.log({ textureBindGroup, outputTextureBindGroup1, outputTextureBindGroup2 })

  const computeBlurPass = new ComputePass(gpuCurtains.renderer, {
    label: 'Compute blur',
    shaders: {
      compute: {
        code: computeBlur,
        entryPoint: 'main',
      },
    },
    bindGroups: [textureBindGroup],
    uniforms: {
      params: {
        label: 'Params',
        struct: {
          filterDim: {
            type: 'i32',
            value: 15,
          },
          blockDim: {
            type: 'u32',
            value: blockDimension,
          },
        },
      },
    },
  })

  // computeBlurPass.onReady(() => {
  //   console.log('ready', computeBlurPass)
  //   console.log(computeBlurPass.material.getBindingByName('params'))
  // })

  // use a custom render function
  // here the pipeline has already been set
  // we just have to set the bind groups and dispatch the work groups as we want
  computeBlurPass.useCustomRender((pass) => {
    // update the bindings of the 2 bind groups that are not part of the compute pass
    outputTextureBindGroup1.update()
    outputTextureBindGroup2.update()

    const samplerBindGroup = computeBlurPass.material.texturesBindGroup
    const uniformBindGroup = computeBlurPass.material.getBindGroupByBindingName('params')

    // bind the sampler bind group
    pass.setBindGroup(samplerBindGroup.index, samplerBindGroup.bindGroup)
    // bind the params uniforms bind group
    pass.setBindGroup(uniformBindGroup.index, uniformBindGroup.bindGroup)

    // now the blur process
    pass.setBindGroup(textureBindGroup.index, textureBindGroup.bindGroup)
    pass.dispatchWorkgroups(
      Math.ceil(outputTexture.size.width / blockDimension),
      Math.ceil(outputTexture.size.height / batchSize)
    )

    pass.setBindGroup(textureBindGroup.index, outputTextureBindGroup1.bindGroup)
    pass.dispatchWorkgroups(
      Math.ceil(outputTexture.size.height / blockDimension),
      Math.ceil(outputTexture.size.width / batchSize)
    )

    for (let i = 0; i < blurIterations - 1; i++) {
      pass.setBindGroup(textureBindGroup.index, outputTextureBindGroup2.bindGroup)
      pass.dispatchWorkgroups(
        Math.ceil(outputTexture.size.width / blockDimension),
        Math.ceil(outputTexture.size.height / batchSize)
      )

      pass.setBindGroup(textureBindGroup.index, outputTextureBindGroup1.bindGroup)
      pass.dispatchWorkgroups(
        Math.ceil(outputTexture.size.height / blockDimension),
        Math.ceil(outputTexture.size.width / batchSize)
      )
    }
  })
})
