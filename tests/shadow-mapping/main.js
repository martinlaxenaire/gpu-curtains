import { vec3, mat4 } from 'https://wgpu-matrix.org/dist/2.x/wgpu-matrix.module.js'

// Shadow mapping test
//
// the idea is to render the scene objects twice:
// 1. In a render target that just renders to a shadow map depth texture, with only a vertex shader
//    (the vertex shader returned position is the light view projection matrix multiplied by the object world matrix)
//
// 2. To the screen, using the previous shadow map depth texture to shade the object
//
//
// The webgpu part is working but there's something wrong with the maths
// refs:
// https://webgpu.github.io/webgpu-samples/samples/shadowMapping
// https://github.com/jack1232/webgpu-new-video-series/blob/video08/src/examples/sc02/shadow.ts
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/gpu-curtains.mjs'
  const {
    PlaneGeometry,
    GPUCurtains,
    Mesh,
    SphereGeometry,
    RenderTexture,
    Vec3,
    RenderTarget,
    Sampler,
    Object3D,
    Mat4,
  } = await import(/* @vite-ignore */ path)

  // set up our WebGPU context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  // get the camera
  const { camera } = gpuCurtains.renderer

  const cameraPivot = new Object3D()

  camera.parent = cameraPivot
  camera.position.y = 10
  camera.position.z = 20

  camera.lookAt(new Vec3(0, 2, 0))

  gpuCurtains.onRender(() => {
    cameraPivot.rotation.y -= 0.01
  })

  const lightPos = [10, 30, 15]
  const orthoSettings = {
    left: -40,
    right: 40,
    bottom: -40,
    top: 40,
    near: -50,
    far: 250,
  }

  // using Mat4

  const curtainsLightPosition = new Vec3(lightPos[0], lightPos[1], lightPos[2])

  const curtainsLightViewMatrix = new Mat4().lookAt(curtainsLightPosition, new Vec3(), new Vec3(0, 1, 0))
  const curtainsLightProjectionMatrix = new Mat4()

  const makeOrtho = (matrix, { left, right, bottom, top, near, far }) => {
    matrix.elements[0] = 2 / (right - left)
    matrix.elements[1] = 0
    matrix.elements[2] = 0
    matrix.elements[3] = 0

    matrix.elements[4] = 0
    matrix.elements[5] = 2 / (top - bottom)
    matrix.elements[6] = 0
    matrix.elements[7] = 0

    matrix.elements[8] = 0
    matrix.elements[9] = 0
    matrix.elements[10] = 1 / (near - far)
    matrix.elements[11] = 0

    matrix.elements[12] = (right + left) / (left - right)
    matrix.elements[13] = (top + bottom) / (bottom - top)
    matrix.elements[14] = near / (near - far)
    matrix.elements[15] = 1
  }

  makeOrtho(curtainsLightProjectionMatrix, orthoSettings)

  const curtainsLightViewProjMatrix = new Mat4().multiplyMatrices(
    curtainsLightViewMatrix,
    curtainsLightProjectionMatrix
  )

  // using wgpu-matrix

  const upVector = vec3.fromValues(0, 1, 0)
  const origin = vec3.fromValues(0, 0, 0)
  const wgpuLightPosition = vec3.fromValues(lightPos[0], lightPos[1], lightPos[2])
  const wgpuLightViewMatrix = mat4.lookAt(wgpuLightPosition, origin, upVector)
  const wgpuLightProjectionMatrix = mat4.create()
  {
    const left = orthoSettings.left
    const right = orthoSettings.right
    const bottom = orthoSettings.bottom
    const top = orthoSettings.top
    const near = orthoSettings.near
    const far = orthoSettings.far
    mat4.ortho(left, right, bottom, top, near, far, wgpuLightProjectionMatrix)
  }

  const wgpuLightViewProjMatrix = mat4.multiply(wgpuLightProjectionMatrix, wgpuLightViewMatrix)

  console.log('light view matrices', curtainsLightViewMatrix.elements, wgpuLightViewMatrix)
  console.log('light view projection matrices', curtainsLightViewProjMatrix.elements, wgpuLightProjectionMatrix)

  const lightPosition = wgpuLightPosition
  const lightViewProjMatrix = wgpuLightViewProjMatrix

  //const shadowMapTextureFormat = 'depth32float'
  const shadowMapTextureFormat = 'depth24plus'

  const shadowDepthTexture = new RenderTexture(gpuCurtains, {
    label: 'Shadow depth texture',
    name: 'shadowDepthTexture',
    usage: 'depth',
    format: shadowMapTextureFormat,
    fixedSize: {
      width: 1024,
      height: 1024,
    },
  })

  const depthTarget = new RenderTarget(gpuCurtains, {
    label: 'Shadow map render target',
    useColorAttachments: false,
    depthTexture: shadowDepthTexture,
    sampleCount: 1,
    //depthLoadOp: 'load',
  })

  const lessCompareSampler = new Sampler(gpuCurtains, {
    label: 'Shadow sampler',
    name: 'shadowSampler',
    compare: 'less',
    type: 'comparison',
  })

  console.log('depth target', depthTarget)

  const depthVs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> @builtin(position) vec4<f32> {
      return lightning.lightViewProjectionMatrix * matrices.world * vec4(attributes.position, 1.0);
    }
  `

  const meshVs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) shadowPos: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      // XY is in (-1, 1) space, Z is in (0, 1) space
      let posFromLight = lightning.lightViewProjectionMatrix * matrices.world * vec4(attributes.position, 1.0);
    
      // Convert XY to (0, 1)
      // Y is flipped because texture coords are Y-down.
      vsOutput.shadowPos = vec3(
        posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
        posFromLight.z
      );
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) shadowPos: vec3f,
    };
    
    const albedo = vec3<f32>(0.9);
    const ambientFactor = 0.2;
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // Percentage-closer filtering. Sample texels in the region
      // to smooth the result.
      var visibility = 0.0;
      
      let size = f32(textureDimensions(shadowDepthTexture).x);
      
      let oneOverShadowDepthTextureSize = 1.0 / size;
      for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
          let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;
    
          visibility += textureSampleCompare(
            shadowDepthTexture,
            shadowSampler,
            fsInput.shadowPos.xy + offset,
            fsInput.shadowPos.z - 0.007
          );
        }
      }
      visibility /= 9.0;
      
      let lambertFactor = max(dot(normalize(lightning.lightPosition - fsInput.position.xyz), normalize(fsInput.normal)), 0.0);
      let lightingFactor = min(ambientFactor + visibility * lambertFactor, 1.0);

      return vec4(lightingFactor * shading.color, 1.0);
      //return vec4(lightingFactor * albedo, 1.0);
    }
  `

  const spheres = {
    depth: new Mesh(gpuCurtains, {
      label: 'Sphere depth',
      geometry: new SphereGeometry(),
      renderTarget: depthTarget,
      shaders: {
        vertex: {
          code: depthVs,
        },
        fragment: false,
      },
      depthFormat: shadowMapTextureFormat,
      uniforms: {
        lightning: {
          struct: {
            lightViewProjectionMatrix: {
              type: 'mat4x4f',
              value: lightViewProjMatrix,
            },
            lightPosition: {
              type: 'vec3f',
              value: lightPosition,
            },
          },
        },
      },
    }),
    screen: new Mesh(gpuCurtains, {
      label: 'Sphere screen',
      geometry: new SphereGeometry(),
      renderTextures: [shadowDepthTexture],
      samplers: [lessCompareSampler],
      shaders: {
        vertex: {
          code: meshVs,
        },
        fragment: {
          code: meshFs,
        },
      },
      uniforms: {
        lightning: {
          struct: {
            lightViewProjectionMatrix: {
              type: 'mat4x4f',
              value: lightViewProjMatrix,
            },
            lightPosition: {
              type: 'vec3f',
              value: lightPosition,
            },
          },
        },
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: new Vec3(1, 0, 1),
            },
          },
        },
      },
    }),
  }

  spheres.depth.position.y = 4
  spheres.screen.position.y = 4

  spheres.depth.scale.set(2)
  spheres.screen.scale.set(2)

  console.log(spheres)

  const floors = {
    depth: new Mesh(gpuCurtains, {
      geometry: new PlaneGeometry(),
      renderTarget: depthTarget,
      shaders: {
        vertex: {
          code: depthVs,
        },
        fragment: false,
      },
      depthFormat: shadowMapTextureFormat,
      frustumCulled: false, // always draw the floor
      cullMode: 'none',
      uniforms: {
        lightning: {
          struct: {
            lightViewProjectionMatrix: {
              type: 'mat4x4f',
              value: lightViewProjMatrix,
            },
            lightPosition: {
              type: 'vec3f',
              value: lightPosition,
            },
          },
        },
      },
    }),
    screen: new Mesh(gpuCurtains, {
      geometry: new PlaneGeometry(),
      frustumCulled: false, // always draw the floor
      cullMode: 'none',
      renderTextures: [shadowDepthTexture],
      samplers: [lessCompareSampler],
      shaders: {
        vertex: {
          code: meshVs,
        },
        fragment: {
          code: meshFs,
        },
      },
      uniforms: {
        lightning: {
          struct: {
            lightViewProjectionMatrix: {
              type: 'mat4x4f',
              value: lightViewProjMatrix,
            },
            lightPosition: {
              type: 'vec3f',
              value: lightPosition,
            },
          },
        },
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: new Vec3(0.5, 0.5, 0.5),
            },
          },
        },
      },
    }),
  }

  floors.depth.rotation.x = -Math.PI / 2
  floors.screen.rotation.x = -Math.PI / 2

  floors.depth.scale.set(20, 20, 1)
  floors.screen.scale.set(20, 20, 1)

  console.log(gpuCurtains)

  // DEBUG DEPTH

  const debugDepthVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

      vsOutput.position = vec4(
        attributes.position * vec3(params.size, params.size * params.aspect, 1.0) - vec3(0.8, 0.8, 0.0),
        1.0
      );
      
      vsOutput.uv = attributes.uv;

      return vsOutput;
    }
  `

  const debugDepthFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
      let rawDepth = textureLoad(
        depthTexture,
        vec2<i32>(floor(vec2(fsInput.position.x, fsInput.position.y))),
        0
      );
      
      // remap depth into something a bit more visible
      let depth = (1.0 - rawDepth) * 1.0;
      
      var color: vec4f = vec4(depth, depth, depth, 1.0);

      return color;
    }
  `

  const debugPlane = new Mesh(gpuCurtains, {
    label: 'Debug depth plane',
    geometry: new PlaneGeometry(),
    depthWriteEnabled: false,
    frustumCulled: false,
    transparent: true,
    cullMode: 'none',
    shaders: {
      vertex: {
        code: debugDepthVs,
      },
      fragment: {
        code: debugDepthFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          aspect: {
            type: 'f32',
            value: gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height,
          },
          size: {
            type: 'f32',
            value: 0.2,
          },
        },
      },
    },
  })

  const depthTexture = debugPlane.createRenderTexture({
    label: 'Debug depth texture',
    name: 'depthTexture',
    usage: 'depth',
    //format: shadowMapTextureFormat,
    fromTexture: shadowDepthTexture,
    //fromTexture: depthTarget.renderPass.depthTexture,
  })

  gpuCurtains.renderer.scene.logRenderCommands()
})
