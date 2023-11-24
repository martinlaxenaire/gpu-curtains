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
var<workgroup> tile : array<array<vec3<f32>, 128>, 4>;

@compute @workgroup_size(32, 1, 1)
fn main(
  @builtin(workgroup_id) WorkGroupID : vec3<u32>,
  @builtin(local_invocation_id) LocalInvocationID : vec3<u32>
) {
  let filterOffset = (params.filterDim - 1) / 2;
  let dims = vec2<i32>(textureDimensions(inputTexture, 0));
  //let dims = vec2<i32>(1280, 720);
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
      ).rgb;
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
        var acc = vec3(0.0, 0.0, 0.0);
        for (var f = 0; f < params.filterDim; f++) {
          var i = center + f - filterOffset;
          acc = acc + (1.0 / f32(params.filterDim)) * tile[r][i];
        }
        textureStore(outputTexture, writeIndex, vec4(acc, 1.0));
      }
    }
  }
  
}
`

window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  const tileDimension = 128
  const filterSize = 15
  const blockDimension = tileDimension - (filterSize - 1)
  const blurIterations = 2
  const batchSize = 4
  const format = 'rgba8unorm'

  const planeEl = document.querySelector('#blur')
  const imageToBlur = planeEl.querySelector('img')

  const imageTexture = new GPUCurtains.Texture(gpuCurtains, {
    label: 'image texture',
    name: 'imageTexture',
    format,
  })

  await imageTexture.loadImage(imageToBlur)

  imageTexture.onSourceUploaded(() => {
    console.log('source uploaded')
  })

  const inputTexture = new GPUCurtains.RenderTexture(gpuCurtains, {
    label: 'Compute input texture',
    name: 'inputTexture',
    format,
    fromTexture: imageTexture,
  })

  const tempTexture = new GPUCurtains.RenderTexture(gpuCurtains, {
    label: 'Compute temp texture',
    name: 'outputTexture',
    usage: 'storageTexture',
    format,
    size: inputTexture.size,
  })

  const outputTexture = new GPUCurtains.RenderTexture(gpuCurtains, {
    label: 'Compute output texture',
    name: 'outputTexture',
    usage: 'storageTexture',
    format,
    size: inputTexture.size,
  })

  const flipBinding0 = new GPUCurtains.BufferBinding({
    label: 'Direction',
    name: 'direction',
    bindingType: 'uniform',
    visibility: 'compute',
    bindings: {
      flip: {
        type: 'u32',
        value: 0,
      },
    },
  })

  const flipBinding1 = new GPUCurtains.BufferBinding({
    label: 'Direction',
    name: 'direction',
    bindingType: 'uniform',
    visibility: 'compute',
    bindings: {
      flip: {
        type: 'u32',
        value: 1,
      },
    },
  })

  const textureBindGroup = new GPUCurtains.TextureBindGroup(gpuCurtains.renderer, {
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

  const computeBlurPass = new GPUCurtains.ComputePass(gpuCurtains.renderer, {
    label: 'Compute blur',
    autoAddToScene: false,
    shaders: {
      compute: {
        code: computeBlur,
        entryPoint: 'main',
      },
    },
    bindGroups: [textureBindGroup],
    inputs: {
      uniforms: {
        params: {
          label: 'Params',
          bindings: {
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
    },
  })

  computeBlurPass.onReady(() => {
    console.log('ready', computeBlurPass)
    console.log(computeBlurPass.material.getBindingByName('params'))
  })

  gpuCurtains.renderer.onBeforeRenderScene.add((commandEncoder) => {
    computeBlurPass.onBeforeRenderPass()

    // also update the bindings of the 2 bind groups that are not part of the compute pass
    outputTextureBindGroup1.update()
    outputTextureBindGroup2.update()

    if (!computeBlurPass.ready) return

    const blurPass = commandEncoder.beginComputePass()
    computeBlurPass.material.setPipeline(blurPass)

    const samplerBindGroup = computeBlurPass.material.texturesBindGroup
    const uniformBindGroup = computeBlurPass.material.getBindGroupByBindingName('params')

    // bind the sampler bind group
    blurPass.setBindGroup(samplerBindGroup.index, samplerBindGroup.bindGroup)
    // bind the params uniforms bind group
    blurPass.setBindGroup(uniformBindGroup.index, uniformBindGroup.bindGroup)

    // now the blur process
    blurPass.setBindGroup(textureBindGroup.index, textureBindGroup.bindGroup)
    blurPass.dispatchWorkgroups(
      Math.ceil(outputTexture.size.width / blockDimension),
      Math.ceil(outputTexture.size.height / batchSize)
    )

    blurPass.setBindGroup(textureBindGroup.index, outputTextureBindGroup1.bindGroup)
    blurPass.dispatchWorkgroups(
      Math.ceil(outputTexture.size.height / blockDimension),
      Math.ceil(outputTexture.size.width / batchSize)
    )

    for (let i = 0; i < blurIterations - 1; i++) {
      blurPass.setBindGroup(textureBindGroup.index, outputTextureBindGroup2.bindGroup)
      blurPass.dispatchWorkgroups(
        Math.ceil(outputTexture.size.width / blockDimension),
        Math.ceil(outputTexture.size.height / batchSize)
      )

      blurPass.setBindGroup(textureBindGroup.index, outputTextureBindGroup1.bindGroup)
      blurPass.dispatchWorkgroups(
        Math.ceil(outputTexture.size.height / blockDimension),
        Math.ceil(outputTexture.size.width / batchSize)
      )
    }

    blurPass.end()
  })

  const planeVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) originalUv: vec2f, // debug
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
        
        vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
        vsOutput.uv = getUVCover(attributes.uv, imageTextureMatrix);
        vsOutput.originalUv = attributes.uv;
      
        return vsOutput;
      }
    `

  const planeFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) originalUv: vec2f, // debug
      };
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var color: vec4f = textureSample(blurredTexture, defaultSampler, fsInput.uv);
                      
        return color;
      }
    `

  const params = {
    autoloadSources: false,
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

  const plane = new GPUCurtains.Plane(gpuCurtains, planeEl, params)

  console.log(plane)

  plane.addTexture(imageTexture)

  const blurredTexture = plane.createRenderTexture({
    label: 'Blur render texture',
    name: 'blurredTexture',
    fromTexture: outputTexture,
  })

  // plane.onBeforeRender(() => {
  //   blurredTexture.texture = outputTexture2.texture
  // })
})