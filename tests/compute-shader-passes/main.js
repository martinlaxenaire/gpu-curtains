// Goal of this test is checking if device lost/restoration works
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, ComputeShaderPass } = await import(
    /* @vite-ignore */ path
  )

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  const mesh = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
  })

  mesh.onBeforeRender(() => {
    mesh.rotation.y += 0.02
  })

  console.log(mesh)

  const basicComputeShader = /* wgsl */ `
    @compute @workgroup_size(16, 16) fn main(
        @builtin(global_invocation_id) id: vec3<u32>
    ) {
      let dims = textureDimensions(renderTexture);

      if (id.x >= dims.x || id.y >= dims.y) {
        return;
      }

      let uv: vec2f = vec2(vec2f(id.xy) / vec2f(dims));

      var texture = textureLoad(renderTexture, vec2<i32>(id.xy), 0u);

      // just display a red band on top of screen
      var color = mix( texture, vec4(1.0, 0.0, 0.0, 1.0), step(uv.y, 0.25) );

      textureStore(storageRenderTexture, vec2<i32>(id.xy), color);
    }`

  const computeShader = /* wgsl */ `
    @compute @workgroup_size(16, 16) fn main(
        @builtin(global_invocation_id) id: vec3<u32>
    ) {
      let dims = textureDimensions(renderTexture);

      if (id.x >= dims.x || id.y >= dims.y) {
        return;
      }

      let uv: vec2f = vec2(vec2f(id.xy) / vec2f(dims));

      var texture = textureLoad(renderTexture, vec2<i32>(id.xy), 0u);

      let timeEffect = cos(params.time) * 0.5 + 0.5;
      var color = mix( texture, vec4(1.0 - texture.rgb, texture.a), step(uv.x, timeEffect) );

      textureStore(storageRenderTexture, vec2<i32>(id.xy), color);
    }`

  const firstComputeShaderPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'First compute shader pass',
    shaders: {
      compute: {
        code: basicComputeShader,
      },
    },
  })

  const computeShaderPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute shader pass',
    shaders: {
      compute: {
        code: computeShader,
      },
    },
    storageTextureParams: {
      format: 'rgba16float',
    },
    uniforms: {
      params: {
        struct: {
          time: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  computeShaderPass.onRender(() => {
    // console.log('from here')
    computeShaderPass.uniforms.params.time.value += 0.01
  })

  console.log(computeShaderPass)
})
