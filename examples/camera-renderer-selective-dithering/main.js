import {
  GPUCameraRenderer,
  GPUDeviceManager,
  BoxGeometry,
  OrbitControls,
  AmbientLight,
  DirectionalLight,
  LitMesh,
  RenderTarget,
  ShaderPass,
  SphereGeometry,
  Vec3,
} from '../../dist/esm/index.mjs'

// this examples demonstrates how we can apply a post processing effect to a specific set of meshes
// while preserving the depth buffer
// unfortunately, if you'd want to apply more than one pass to a set of meshes,
// you'd have to do it another way
// see https://github.com/martinlaxenaire/gpu-curtains/blob/main/tests/orbit-camera-selective-passes/main.js
window.addEventListener('load', async () => {
  const systemSize = 10

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    onError: () => {
      // handle device creation error here
      console.log('there has been an error!')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0.1,
      far: systemSize * 10,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  // set the camera initial position and transform origin, so we can rotate around our scene center
  camera.position.z = systemSize * 3.25

  // orbit controls
  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.zoomSpeed = 2
  orbitControls.maxZoom = systemSize * 6

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.3,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize * 2, systemSize * 2, systemSize),
    intensity: 2,
  })

  // the spheres will be rendered in a separate render target
  // they will be rendered on screen using a postprocessing pass where they'll be dithered
  // using the depth from our cube scene
  const selectiveDitheringTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective dithering render target',
    isPostTarget: true, // render after the cube scene
    forceDepthLoadOp: 'load', // load the depth buffer from the cube scene into this pass
  })

  // our dither pass where we'll render the spheres with a dithering effect
  // from https://www.shadertoy.com/view/ltSSzW
  const ditherFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    fn modulo(x: vec2f, y: vec2f) -> vec2f {
      return x - y * floor(x / y);
    }
    
    fn getValue(brightness: f32, pos: vec2f) -> bool {
      
      // do the simple math first
      if (brightness > 16.0/17.0) {
        return false;
      }
      
      if (brightness < 01.0/17.0) {
        return true;
      }
      
      var pixel: vec2f = vec2( floor( modulo( (pos + 0.5) / params.pixelSize, vec2(4.0)) ) );
      
      var x: i32 = i32(pixel.x);
      var y: i32 = i32(pixel.y);
      var result: bool = false;
      
      // compute the 16 values by hand, store when it's a match
      if (x == 0 && y == 0) {
        result = brightness < 16.0/17.0;
      } else if (x == 2 && y == 2) {
        result = brightness < 15.0/17.0;
      } else if (x == 2 && y == 0) {
        result = brightness < 14.0/17.0;
      } else if (x == 0 && y == 2) {
        result = brightness < 13.0/17.0;
      } else if (x == 1 && y == 1) {
        result = brightness < 12.0/17.0;
      } else if (x == 3 && y == 3) {
        result = brightness < 11.0/17.0;
      } else if (x == 3 && y == 1) {
        result = brightness < 10.0/17.0;
      } else if (x == 1 && y == 3) {
        result = brightness < 09.0/17.0;
      } else if (x == 1 && y == 0) {
        result = brightness < 08.0/17.0;
      } else if (x == 3 && y == 2) {
        result = brightness < 07.0/17.0;
      } else if (x == 3 && y == 0) {
        result = brightness < 06.0/17.0;
      } else if (x == 0 && y == 1) {
        result =	brightness < 05.0/17.0;
      } else if (x == 1 && y == 2) {
        result = brightness < 04.0/17.0;
      } else if (x == 2 && y == 3) {
        result = brightness < 03.0/17.0;
      } else if (x == 2 && y == 1) {
        result = brightness < 02.0/17.0;
      } else if (x == 0 && y == 3) {
        result = brightness < 01.0/17.0;
      }
          
      return result;
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      
      var grayscale: f32 = color.r * 0.3 + color.g * 0.59 + color.b * 0.11;
      
      // here fsInput.position.xy ranges from [0, 0] to [canvasWidth, canvasHeight]
      var dither: f32 = select(0.0, 1.0, getValue( grayscale, fsInput.position.xy )) * color.a;
      
      // mix dithering with original color
      return vec4(vec3(dither) * color.rgb, dither);
    }
  `

  const ditherPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Selective dither pass',
    inputTarget: selectiveDitheringTarget,
    shaders: {
      fragment: {
        code: ditherFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          pixelSize: {
            type: 'f32',
            value: 2 * gpuCameraRenderer.pixelRatio,
          },
        },
      },
    },
  })

  // now draw everything
  // the cubes will be drawn to the main buffer as usual
  // the spheres will be drawn into our render target defined above
  // they will use a lambert shading
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.9)

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5

    const mesh = new LitMesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      outputTarget: isCube ? null : selectiveDitheringTarget,
      material: {
        shading: 'Lambert',
        color: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
      },
      ...(!isCube && {
        depthCompare: 'less-equal',
      }),
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    if (!isCube) {
      mesh.scale.set(1.25)
    }

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }
})
