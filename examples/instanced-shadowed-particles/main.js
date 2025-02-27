import {
  GPUDeviceManager,
  GPUCameraRenderer,
  BindGroup,
  AmbientLight,
  DirectionalLight,
  BoxGeometry,
  BufferBinding,
  ComputePass,
  LitMesh,
  PlaneGeometry,
  Vec2,
  Vec3,
  sRGBToLinear,
} from '../../dist/esm/index.mjs'

import { computeParticles } from './shaders/compute-particles.wgsl.js'
import { preliminaryFragmentParticle } from './shaders/chunks/preliminary-fragment-particle.wgsl.js'
import { particlesDepthPassShaders } from './shaders/shadowed-particles.wgsl.js'
import { additionalVertexParticle } from './shaders/chunks/additional-vertex-particle.wgsl.js'
import { getParticleSize } from './shaders/chunks/get-particle-size.wgsl.js'

// Port of https://okaydev.co/articles/dive-into-webgpu-part-4
// with the current lib features
// This demonstrates how to create complex scenes with built-in lit meshes
// With the ability to use chunks, patch the default built-in shaders, create custom shadow maps shaders...
window.addEventListener('load', async () => {
  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  gpuDeviceManager.init()

  // create a camera renderer
  const renderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  //--------------------
  // SETUP
  //--------------------

  const nbInstances = 100_000
  // particle system radius
  const radius = 50
  const particleSize = 0.7
  const distance = 375

  const { camera } = renderer
  camera.position.z = distance

  const ambientLight = new AmbientLight(renderer, {
    intensity: 0.35,
  })

  const directionalLight = new DirectionalLight(renderer, {
    intensity: 1.5,
  })

  let visibleSize

  const onResize = () => {
    visibleSize = camera.getVisibleSizeAtDepth()
  }

  renderer.onResize(onResize)

  onResize()

  // lazy test to assign a smaller depth texture on mobile
  const shadowTextureSize = renderer.boundingRect.width < 1000 && renderer.boundingRect.height < 1000 ? 1024 : 1536

  directionalLight.position.set(distance * 2, distance, distance * 2)
  directionalLight.shadow.cast({
    depthTextureSize: new Vec2(shadowTextureSize),
    intensity: 1,
    pcfSamples: 3,
    camera: {
      left: distance * -1.25,
      right: distance * 1.25,
      top: distance * 1.25,
      bottom: distance * -1.25,
      near: 0.1,
      far: distance * 6,
    },
  })

  //--------------------
  // INTERACTION
  //--------------------

  const mouse = {
    current: new Vec2(),
    lerped: new Vec2(),
    clamp: {
      min: new Vec2(-0.5),
      max: new Vec2(0.5),
    },
  }

  const onPointerMove = (e) => {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    const { width, height } = renderer.boundingRect

    // normalized between -0.5 and 0.5
    mouse.current.set((clientX - width * 0.5) / width, -(clientY - height * 0.5) / height)

    // clamp
    mouse.current.clamp(mouse.clamp.min, mouse.clamp.max)

    // multiply by camera visible size
    mouse.current.x *= visibleSize.width
    mouse.current.y *= visibleSize.height
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove)

  renderer.onBeforeRender(() => {
    mouse.lerped.lerp(mouse.current, 0.5)
  })

  //--------------------
  // COMPUTE PASSES
  //--------------------

  const initComputeBuffer = new BufferBinding({
    label: 'Compute particles init buffer',
    name: 'initParticles',
    bindingType: 'storage',
    access: 'read_write', // we want a readable AND writable buffer!
    usage: ['vertex'], // we're going to use this buffer as a vertex buffer along default usages
    visibility: ['compute'],
    struct: {
      position: {
        type: 'array<vec4f>',
        value: new Float32Array(nbInstances * 4),
      },
      velocity: {
        type: 'array<vec4f>',
        value: new Float32Array(nbInstances * 4),
      },
    },
  })

  // update buffer, cloned from init one
  const updateComputeBuffer = initComputeBuffer.clone({
    ...initComputeBuffer.options,
    label: 'Compute particles update buffer',
    name: 'particles',
  })

  const computeBindGroup = new BindGroup(renderer, {
    label: 'Compute instances bind group',
    bindings: [initComputeBuffer, updateComputeBuffer],
    uniforms: {
      params: {
        visibility: ['compute'],
        struct: {
          radius: {
            type: 'f32',
            value: radius,
          },
          maxLife: {
            type: 'f32',
            value: 60, // in frames
          },
          mouse: {
            type: 'vec2f',
            value: mouse.lerped,
          },
        },
      },
    },
  })

  const computeInitDataPass = new ComputePass(renderer, {
    label: 'Compute initial data',
    shaders: {
      compute: {
        code: computeParticles,
        entryPoint: 'setInitData',
      },
    },
    dispatchSize: Math.ceil(nbInstances / 256),
    bindGroups: [computeBindGroup],
    autoRender: false, // we don't want to run this pass each frame
  })

  // we should wait for pipeline compilation!
  await computeInitDataPass.material.compileMaterial()

  // now run the compute pass just once
  renderer.renderOnce([computeInitDataPass])

  const computePass = new ComputePass(renderer, {
    label: 'Compute particles pass',
    shaders: {
      compute: {
        code: computeParticles,
        entryPoint: 'updateData',
      },
    },
    dispatchSize: Math.ceil(nbInstances / 256),
    bindGroups: [computeBindGroup],
  })

  // we're done with our first compute pass, remove it
  computeInitDataPass.remove()

  //--------------------
  // RENDERING
  //--------------------

  const toneMapping = 'Khronos'

  //--------------------
  // PARTICLES
  //--------------------

  const geometry = new PlaneGeometry({
    instancesCount: nbInstances,
    vertexBuffers: [
      {
        // use instancing
        stepMode: 'instance',
        name: 'instanceAttributes',
        buffer: updateComputeBuffer.buffer, // pass the compute buffer right away
        attributes: [
          {
            name: 'particlePosition',
            type: 'vec4f',
            bufferFormat: 'float32x4',
            size: 4,
          },
          {
            name: 'particleVelocity',
            type: 'vec4f',
            bufferFormat: 'float32x4',
            size: 4,
          },
        ],
      },
    ],
  })

  // since we need this uniform in both the depth pass and regular pass
  // create a new buffer binding that will be shared by both materials
  const particlesParamsBindings = new BufferBinding({
    label: 'Params',
    name: 'params',
    bindingType: 'uniform',
    visibility: ['vertex'],
    struct: {
      size: {
        type: 'f32',
        value: particleSize,
      },
    },
  })

  // particles colors
  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)

  const particlesSystem = new LitMesh(renderer, {
    label: 'Shadowed particles system',
    geometry,
    frustumCulling: false,
    receiveShadows: true,
    material: {
      shading: 'Lambert',
      color: blue,
      toneMapping,
      // we need an additional 'velocity' varying
      // to pass from the vertex to the fragment shader
      additionalVaryings: [
        {
          name: 'velocity',
          type: 'vec4f',
        },
      ],
      vertexChunks: {
        additionalHead: getParticleSize,
        additionalContribution: additionalVertexParticle,
      },
      fragmentChunks: {
        preliminaryContribution: preliminaryFragmentParticle,
      },
    },
    uniforms: {
      shading: {
        struct: {
          pinkColor: {
            type: 'vec3f',
            // externally added colors need to be in linear space
            value: sRGBToLinear(pink),
          },
          velocityStrength: {
            type: 'f32',
            value: 0.625,
          },
        },
      },
    },
    bindings: [particlesParamsBindings],
  })

  // add the particles to shadow map with additional parameters
  directionalLight.shadow.addShadowCastingMesh(particlesSystem, {
    bindings: [particlesParamsBindings],
    shaders: {
      vertex: {
        code: particlesDepthPassShaders,
        entryPoint: 'shadowMapVertex',
      },
      fragment: {
        code: particlesDepthPassShaders,
        entryPoint: 'shadowMapFragment',
      },
    },
  })

  //--------------------
  // WRAPPING BOX
  //--------------------

  const wrappingBox = new LitMesh(renderer, {
    label: 'Shadowed wrapping box',
    geometry: new BoxGeometry(),
    frustumCulling: false,
    cullMode: 'front',
    receiveShadows: true,
    material: {
      shading: 'Lambert',
      toneMapping,
      color: new Vec3(0.5), // automatically converted to linear space
    },
  })

  const setWrappingBoxScale = () => {
    wrappingBox.scale.x = visibleSize.width * 0.5
    wrappingBox.scale.y = visibleSize.height * 0.5
  }

  wrappingBox.scale.z = radius * 1.5
  wrappingBox.position.z = -wrappingBox.scale.z

  setWrappingBoxScale()

  wrappingBox.onAfterResize(setWrappingBoxScale)
})
