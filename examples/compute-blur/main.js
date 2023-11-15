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
        //textureStore(outputTexture, writeIndex, vec4(1.0, 0.0, 0.0, 1.0));
      }
    }
  }
}
`

window.addEventListener('DOMContentLoaded', async () => {
  // new WebGPURecorder({
  //   frames: 100,
  //   export: 'WebGPURecord',
  //   width: 800,
  //   height: 600,
  // })

  /*
  inputTexture = x5.createTexture({"label":`Compute input texture`,"format":`rgba8unorm`,"size":[1280,720],"usage":22,"mipLevelCount":1});
  outputTexture = x5.createTexture({"label":`Compute output texture`,"format":`rgba8unorm`,"size":[1280,720],"usage":14});
  outputTexture2 = x5.createTexture({"label":`Compute output texture 2`,"format":`rgba8unorm`,"size":[1280,720],"usage":14});
  flip0Buffer = x5.createBuffer({"label":`Compute blur texture bind group 1: uniform buffer from: Direction`,"size":16,"usage":108});
  xbd = inputTexture.createView();
  xbe = outputTexture.createView();

  // TEXTURE BIND GROUP
  // BUFFER: flip0Buffer (FLIP0)
  // TEXT VIEW 1: xbd (INPUTTEXTURE) - from TEXTURE1 inputTexture
  // TEXT VIEW 2: xbe (OUPUTTEXTURE) - from TEXTURE2 outputTexture
  xbf = x5.createBindGroupLayout({"label":`Compute blur texture bind group 1 layout`,"entries":[{"binding":0,"buffer":{"type":`uniform`},"visibility":4},{"binding":1,"texture":{"viewDimension":`2d`},"visibility":7},{"binding":2,"storageTexture":{"format":`rgba8unorm`,"viewDimension":`2d`},"visibility":4}]});
  textureBindGroup = x5.createBindGroup({"label":`Compute blur texture bind group 1`,"layout":xbf,"entries":[{"binding":0,"resource":{"buffer":flip0Buffer}},{"binding":1,"resource":xbd},{"binding":2,"resource":xbe}]});


  // OUTPUTBINDGROUP1
  // BUFFER: xc1 (FLIP1)
  // TEXT VIEW 1: xc2 (OUPUTTEXTURE) - from TEXTURE1 outputTexture
  // TEXT VIEW 2: xc3 (OUPUTTEXTURE2) - from TEXTURE2 outputTexture2
  xc1 = x5.createBuffer({"label":`Compute blur texture bind group 1 (copy): uniform buffer from: Direction`,"size":16,"usage":108});
  xc2 = outputTexture.createView();
  xc3 = outputTexture2.createView();
  xc4 = x5.createBindGroupLayout({"label":`Compute blur texture bind group 1 (copy) layout`,"entries":[{"binding":0,"buffer":{"type":`uniform`},"visibility":4},{"binding":1,"texture":{"viewDimension":`2d`},"visibility":7},{"binding":2,"storageTexture":{"format":`rgba8unorm`,"viewDimension":`2d`},"visibility":4}]});
  outputTextureBindGroup1 = x5.createBindGroup({"label":`Compute blur texture bind group 1 (copy)`,"layout":xc4,"entries":[{"binding":0,"resource":{"buffer":xc1}},{"binding":1,"resource":xc2},{"binding":2,"resource":xc3}]});

  // OUTPUTBINDGROUP2
  // BUFFER: flip0Buffer (FLIP0)
  // TEXT VIEW 1: xc6 (OUPUTTEXTURE2) - from TEXTURE1 outputTexture2
  // TEXT VIEW 2: xc7 (OUPUTTEXTURE) - from TEXTURE1 outputTexture
  xc6 = outputTexture2.createView();
  xc7 = outputTexture.createView();
  xc8 = x5.createBindGroupLayout({"label":`Compute blur texture bind group 1 (copy) layout`,"entries":[{"binding":0,"buffer":{"type":`uniform`},"visibility":4},{"binding":1,"texture":{"viewDimension":`2d`},"visibility":7},{"binding":2,"storageTexture":{"format":`rgba8unorm`,"viewDimension":`2d`},"visibility":4}]});
  outputTextureBindGroup2 = x5.createBindGroup({"label":`Compute blur texture bind group 1 (copy)`,"layout":xc8,"entries":[{"binding":0,"resource":{"buffer":flip0Buffer}},{"binding":1,"resource":xc6},{"binding":2,"resource":xc7}]});
  

  // COMPUTE SAMPLER BIND GROUP
  xca = x5.createSampler({"label":`Sampler`,"addressModeU":`repeat`,"addressModeV":`repeat`,"magFilter":`linear`,"minFilter":`linear`,"mipmapFilter":`linear`,"maxAnisotropy":1});
  xcc = x5.createBindGroupLayout({"label":`Compute blur: Textures bind group layout`,"entries":[{"binding":0,"sampler":{"type":`filtering`},"visibility":7}]});
  samplerBindGroup = x5.createBindGroup({"label":`Compute blur: Textures bind group`,"layout":xcc,"entries":[{"binding":0,"resource":xca}]});

  // COMPUTE UNIFORMS BIND GROUP
  xce = x5.createBuffer({"label":`Compute blur: Bindings bind group: uniform buffer from: Params`,"size":16,"usage":108});
  xcf = x5.createBindGroupLayout({"label":`Compute blur: Bindings bind group layout`,"entries":[{"binding":0,"buffer":{"type":`uniform`},"visibility":7}]});
  computeUniformsBindGroup = x5.createBindGroup({"label":`Compute blur: Bindings bind group`,"layout":xcf,"entries":[{"binding":0,"resource":{"buffer":xce}}]});

  // PLANE BIND GROUPS
  xdc = x5.createBindGroupLayout({"label":`Plane: Textures bind group layout`,"entries":[{"binding":0,"sampler":{"type":`filtering`},"visibility":7},{"binding":1,"texture":{"viewDimension":`2d`},"visibility":7},{"binding":2,"buffer":{"type":`uniform`},"visibility":7},{"binding":3,"texture":{"viewDimension":`2d`},"visibility":7}]});

  planeTexturesBindGroup = x5.createBindGroup({"label":`Plane: Textures bind group`,"layout":xdc,"entries":[{"binding":0,"resource":xca},{"binding":1,"resource":xd9},{"binding":2,"resource":{"buffer":xda}},{"binding":3,"resource":xdb}]});

  xde = x5.createBuffer({"label":`Plane: Bindings bind group: uniform buffer from: Matrices`,"size":192,"usage":108});
  xdf = x5.createBindGroupLayout({"label":`Plane: Bindings bind group layout`,"entries":[{"binding":0,"buffer":{"type":`uniform`},"visibility":7}]});
  planeUniformsBindGroup = x5.createBindGroup({"label":`Plane: Bindings bind group`,"layout":xdf,"entries":[{"binding":0,"resource":{"buffer":xde}}]});

  // IMAGE TEXTURE
  xe7 = inputTexture.createView();
  // BLURRED TEXTURE VIEW xe8 FROM OUTPUTTEXTURE2 outputTexture2
  xe8 = outputTexture2.createView();
  planeTexturesBindGroupUpdated = x5.createBindGroup({"label":`Plane: Textures bind group`,"layout":xdc,"entries":[{"binding":0,"resource":xca},{"binding":1,"resource":xe7},{"binding":2,"resource":{"buffer":xda}},{"binding":3,"resource":xe8}]});


  async function f95() {
  let x110,x111,x112,x113,x114,x115;
  x110 = x5.createCommandEncoder({"label":`Renderer command encoder`});
  x111 = x110.beginComputePass();
  x111.setPipeline(xf0);
  x111.setBindGroup(0,samplerBindGroup);
  x111.setBindGroup(1,computeUniformsBindGroup);
  x111.setBindGroup(2,textureBindGroup);
  x111.dispatchWorkgroups(12,180);
  x111.setBindGroup(2,outputTextureBindGroup1);
  x111.dispatchWorkgroups(7,320);
  x111.setBindGroup(2,outputTextureBindGroup2);
  x111.dispatchWorkgroups(12,180);
  x111.setBindGroup(2,outputTextureBindGroup1);
  x111.dispatchWorkgroups(7,320);
  x111.end();

  // RENDER
  x112 = x3.getCurrentTexture();
  x113 = x112.createView();
  x114 = x110.beginRenderPass({"label":`Main Render pass descriptor`,"colorAttachments":[{"view":x9,"clearValue":[0,0,0,0],"loadOp":`clear`,"storeOp":`store`,"resolveTarget":x113}],"depthStencilAttachment":{"view":xa,"depthClearValue":1,"depthLoadOp":`clear`,"depthStoreOp":`store`}});

  // CAMERA
  x114.setBindGroup(0,cameraBindGroup);
  x114.setPipeline(xf1);
  x114.setBindGroup(1,planeTexturesBindGroupUpdated);
  x114.setBindGroup(2,planeUniformsBindGroup);
  x114.setVertexBuffer(0,xd7);
  x114.setIndexBuffer(xd8,`uint32`);
  x114.drawIndexed(6,1);
  x114.end();
  x115 = x110.finish();
  x6.submit([x115]);
}
   */

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
  })

  gpuCurtains.renderer.onBeforeRenderScene.add((commandEncoder) => {
    computeBlurPass.onBeforeRenderPass()

    // also update the buffer bindings of the 2 bind groups that are not part of the compute pass
    outputTextureBindGroup1.updateTextures()
    outputTextureBindGroup1.updateBufferBindings()

    outputTextureBindGroup2.updateTextures()
    outputTextureBindGroup2.updateBufferBindings()

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
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
        
        vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
        //vsOutput.uv = getUVCover(attributes.uv, imageTextureMatrix);
        vsOutput.uv = attributes.uv;
      
        return vsOutput;
      }
    `

  const planeFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
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

  //plane.addRenderTexture(outputTexture2)

  const blurredTexture = plane.createRenderTexture({
    label: 'Blur render texture',
    name: 'blurredTexture',
    fromTexture: outputTexture,
  })

  // plane.onBeforeRender(() => {
  //   blurredTexture.texture = outputTexture2.texture
  // })
})
