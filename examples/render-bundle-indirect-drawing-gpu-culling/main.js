// Port of https://github.com/toji/webgpu-bundle-culling/tree/main
//
// The idea is to do GPU frustum culling
// using a indirect drawing with an indirect buffer,
// a render bundle and a compute pass.
//
// First we create an indirect buffer, a render bundle
// and an indirect args buffer binding using our indirect buffer GPU buffer
//
// Then for each combination of material (here a simple shading color)
// and instanced geometries, we create:
// - instance matrices
// - an instanced geometry that will be added to our indirect buffer
// - a modelBinding buffer binding that will hold the instances' transformation matrices
// - a culledInstancesBinding buffer binding that will hold the culled instanced
// - a bindGroup made of the two previous bindings + the indirect args buffer binding
// - finally a mesh rendered with our render bundle
//
// We then create a compute pass that will check the frustum culling
// It will have as first bind group a bind group containing the camera frustum planes
// We use a custom render function where:
// - we bind the first bind group (camera frustum planes)
// - for each materials/geometries combinations, we bind its bind group
// - then dispatch work groups based on the instances count
// - before each render, we make sure our indirect buffer instances count values are cleared
//
// To ensure this is properly working, we create a debug camera
// we pass its matrices in a buffer binding to all the meshes
// when clicking the debug button, we toggle which camera matrices we want to use

import {
  BoxGeometry,
  SphereGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  DirectionalLight,
  sRGBToLinear,
  getLambert,
  OrbitControls,
  RenderBundle,
  Vec3,
  Quat,
  Mat4,
  BufferBinding,
  BindGroup,
  ComputePass,
  IndirectBuffer,
  Camera,
  Mesh,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    camera: {
      fov: 75,
      far: 400,
    },
  })

  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
    enableZoom: false,
    enablePan: false,
    //minPolarAngle: Math.PI / 2,
    //maxPolarAngle: Math.PI / 2,
    rotateSpeed: 0.75,
  })

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.01,
  })

  // place it far away so it lights evenly all objects in the scene
  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(-250, -500, 1000),
  })

  gpuDeviceManager
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  const indirectBuffer = new IndirectBuffer(gpuCameraRenderer, {
    label: 'Indirect buffer',
  })

  // we are going to display 4000 instances for each combination
  // of materials and geometries
  const nbInstances = 4_000

  const materials = [
    { name: 'Pink', color: sRGBToLinear(new Vec3(1, 0, 1)) },
    { name: 'Blue', color: sRGBToLinear(new Vec3(0, 1, 1)) },
    { name: 'Grey', color: sRGBToLinear(new Vec3(0.85)) },
  ]

  const instancesDefinitionsModel = [
    {
      name: 'Cube instances',
      geometryConstructor: BoxGeometry,
      instancesCount: nbInstances,
      geometry: null, // will be created afterwards
      instancesMatrices: null, // will contain ${instancesCount} transformation matrices
      modelBinding: null, // buffer binding that will hold the instances transformation matrices
      culledInstancesBinding: null, // buffer binding that will hold the culled instanced
      bindGroup: null, // bind group that will handle the culling
      mesh: null, // mesh that will be created
    },
    {
      name: 'Sphere instances',
      geometryConstructor: SphereGeometry,
      instancesCount: nbInstances,
      geometry: null, // will be created afterwards
      instancesMatrices: null, // will contain ${instancesCount} transformation matrices
      modelBinding: null, // buffer binding that will hold the instances transformation matrices
      culledInstancesBinding: null, // buffer binding that will hold the culled instanced
      bindGroup: null, // bind group that will handle the culling
      mesh: null, // mesh that will be created
    },
  ]

  const instancesDefinitions = materials
    .map((material) => {
      return instancesDefinitionsModel.map((instanceDefinition) => {
        return { ...instanceDefinition, color: material.color, name: material.name + ' ' + instanceDefinition.name }
      })
    })
    .flat()

  // create our render bundle
  const renderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'GPU culling render bundle',
    size: instancesDefinitions.length,
  })

  // instances model binding setup
  // temp vectors and quat for instances matrices
  const instance = {
    translation: new Vec3(),
    scale: new Vec3(),
    rotation: new Vec3(),
    quaternion: new Quat(),
    model: new Mat4(),
  }

  const createInstancesMatrices = (instancesCount) => {
    const instancesMatrices = new Float32Array(instancesCount * 16)

    for (let i = 0; i < instancesCount; i++) {
      //const angle = Math.random() * Math.PI * 2
      //instance.translation.set(Math.cos(angle) * 100, (Math.random() * 2 - 1) * 25, Math.sin(angle) * 100)
      instance.translation.set(
        (Math.random() * 2 - 1) * 100,
        (Math.random() * 2 - 1) * 100,
        (Math.random() * 2 - 1) * 100
      )

      const scale = Math.random() + 0.5
      instance.scale.set(scale)

      instance.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      instance.quaternion.setFromVec3(instance.rotation)
      instance.model.compose(instance.translation, instance.quaternion, instance.scale)

      for (let el = 0; el < 16; el++) {
        instancesMatrices[i * 16 + el] = instance.model.elements[el]
      }
    }

    return instancesMatrices
  }

  instancesDefinitions.forEach((instanceDefinition, i) => {
    instanceDefinition.instancesMatrices = createInstancesMatrices(instanceDefinition.instancesCount)
    instanceDefinition.geometry = new instanceDefinition.geometryConstructor({
      instancesCount: instanceDefinition.instancesCount,
    })

    // add geometry to indirect buffer
    indirectBuffer.addGeometry(instanceDefinition.geometry)

    // compute so we can have a radius
    instanceDefinition.geometry.computeGeometry()

    instanceDefinition.modelBinding = new BufferBinding({
      label: 'Instances model',
      name: 'instancesModel',
      bindingType: 'storage',
      visibility: ['compute', 'vertex'],
      struct: {
        models: {
          type: 'array<mat4x4f>',
          value: instanceDefinition.instancesMatrices,
        },
      },
    })

    instanceDefinition.culledInstancesBinding = new BufferBinding({
      label: 'Culled instances',
      name: 'culled',
      bindingType: 'storage',
      access: 'read_write',
      visibility: ['compute'],
      struct: {
        radius: {
          type: 'f32',
          value: instanceDefinition.geometry.boundingBox.radius,
        },
        indirectIndex: {
          type: 'u32',
          value: i,
        },
        instances: {
          type: 'array<u32>',
          value: new Uint32Array(instanceDefinition.instancesCount),
        },
      },
    })
  })

  indirectBuffer.create()

  const indirectArgsBinding = new BufferBinding({
    label: 'Indirect args',
    name: 'indirectArgs',
    bindingType: 'storage',
    access: 'read_write',
    visibility: ['compute'],
    buffer: indirectBuffer.buffer, // use indirect buffer
    struct: {
      drawCount: {
        type: 'array<u32>',
        value: new Uint32Array(indirectBuffer.size),
      },
      instanceCount: {
        type: 'array<atomic<u32>>',
        value: new Uint32Array(indirectBuffer.size),
      },
      pad2: {
        type: 'array<u32>',
        value: new Uint32Array(indirectBuffer.size),
      },
      pad3: {
        type: 'array<u32>',
        value: new Uint32Array(indirectBuffer.size),
      },
      pad4: {
        type: 'array<u32>',
        value: new Uint32Array(indirectBuffer.size),
      },
    },
  })

  instancesDefinitions.forEach((instanceDefinition, i) => {
    instanceDefinition.bindGroup = new BindGroup(gpuCameraRenderer, {
      label: 'Culling bind group for ' + instanceDefinition.name,
      bindings: [instanceDefinition.modelBinding, instanceDefinition.culledInstancesBinding, indirectArgsBinding],
    })

    // create GPUBindGroup right away
    instanceDefinition.bindGroup.createBindGroup()
    // update once so our culledInstancesBinding
    // radius and indirectIndex values are sent to the GPU
    instanceDefinition.bindGroup.update()
  })

  // last thing but that will actually be first bind group
  // is our camera frustum
  const cameraFrustumBinding = new BufferBinding({
    label: 'Camera frustum',
    name: 'cameraFrustum',
    visibility: ['compute'],
    bindingType: 'uniform',
    struct: {
      frustum: {
        type: 'array<vec4f>',
        value: new Float32Array(4 * 6),
      },
    },
  })

  const cameraFrustumBindGroup = new BindGroup(gpuCameraRenderer, {
    label: 'Camera frustum bind group',
    bindings: [cameraFrustumBinding],
  })

  // compute culling
  const computeCullingShader = /* wgsl */ `
    fn isVisible(instanceIndex: u32) -> bool {
      let model = instancesModel.models[instanceIndex];
      let pos = model * vec4(0, 0, 0, 1);

      for (var i = 0; i < 6; i++) {
        if (dot(cameraFrustum.frustum[i], pos) < -culled.radius * 2.0) {
          return false;
        }
      }
      return true;
    }

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) globalId: vec3u) {
      let instanceIndex = globalId.x;
      if (instanceIndex >= arrayLength(&culled.instances)) {
        return;
      }
      
      if (!isVisible(instanceIndex)) { return; }

      let culledIndex = atomicAdd(&indirectArgs[culled.indirectIndex].instanceCount, 1u);
      culled.instances[culledIndex] = instanceIndex;
    }
  `

  const computeCulling = new ComputePass(gpuCameraRenderer, {
    label: 'Compute frustum culling pass',
    // pass the first instance definition bind group as well to build the WGSL structs
    bindGroups: [cameraFrustumBindGroup, instancesDefinitions[0].bindGroup],
    shaders: {
      compute: {
        code: computeCullingShader,
      },
    },
  }).onReady(() => {
    gpuCameraRenderer.onBeforeRenderScene.add((commandEncoder) => {
      // Clear the instance count of the indirect buffer for each drawable
      //commandEncoder.clearBuffer(indirectBuffer.buffer.GPUBuffer, 4, 4)
      instancesDefinitions.forEach((instancesDefinition, i) => {
        const offset = indirectBuffer.getByteOffsetAtIndex(i) + 4
        commandEncoder.clearBuffer(indirectBuffer.buffer.GPUBuffer, offset, 4)
      })
    })
  })

  computeCulling.useCustomRender((pass) => {
    // bind the camera frustum bind group
    pass.setBindGroup(0, cameraFrustumBindGroup.bindGroup)

    instancesDefinitions.forEach((instancesDefinition) => {
      // bind the culling bind group
      pass.setBindGroup(1, instancesDefinition.bindGroup.bindGroup)

      // dispatch
      pass.dispatchWorkgroups(Math.ceil(instancesDefinition.instancesCount / 64))
    })
  })

  // update camera frustum binding
  computeCulling.onBeforeRender(() => {
    const { frustumPlanes } = gpuCameraRenderer.camera

    // concat all frustum planes
    cameraFrustumBinding.inputs.frustum.value = new Float32Array(
      frustumPlanes.reduce((frustumPlane, acc) => [...frustumPlane, ...acc], [])
    )
  })

  const vs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      let instanceIndex = culled.instances[attributes.instanceIndex];
      
      let model = instancesModel.models[instanceIndex];
                  
      if(debug.camera > 0.0) {
        vsOutput.position = 
          debugCamera.projection
          * debugCamera.view
          * model
          * vec4f(attributes.position, 1.0);
      } else {
        vsOutput.position = 
          camera.projection
          * camera.view
          * model
          * vec4f(attributes.position, 1.0);
      }
        
      vsOutput.uv = attributes.uv;
      
      // since we're using uniform scale, we can just multiply the normals
      // with the instance model matrix
      // also, we're computing them in view space
      // it's not correct but the result is more pleasing visually
      vsOutput.normal = normalize((camera.view * model * vec4f(attributes.normal, 0)).xyz);
      
      vsOutput.worldPosition = (model * vec4f(attributes.position, 1.0)).xyz;
      
      return vsOutput;
    }
  `

  // simple lambert shading
  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
    };
    
    ${getLambert()}
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
          
      var color: vec4f = getLambert(
        normalize(fsInput.normal),
        fsInput.worldPosition,
        vec4(shading.color, 1.0),
      );
    
      return color;
    }
  `

  const debugCamera = new Camera({
    far: 500,
    width: gpuCameraRenderer.boundingRect.width,
    height: gpuCameraRenderer.boundingRect.height,
  })

  debugCamera.position.y = 175
  debugCamera.lookAt(new Vec3())

  debugCamera.parent = gpuCameraRenderer.scene

  const debugCameraBinding = new BufferBinding({
    label: 'Debug camera',
    name: 'debugCamera',
    visibility: ['vertex'],
    struct: {
      view: {
        type: 'mat4x4f',
        value: debugCamera.viewMatrix,
      },
      projection: {
        // camera projection matrix
        type: 'mat4x4f',
        value: debugCamera.projectionMatrix,
      },
    },
  })

  instancesDefinitions.forEach((instancesDefinition) => {
    // use culledInstancesBinding buffer and struct
    // but with vertex visibility and read only access
    const culledInstancesVertexBinding = instancesDefinition.culledInstancesBinding.clone({
      visibility: ['vertex'],
      access: 'read',
      buffer: instancesDefinition.culledInstancesBinding.buffer,
    })

    instancesDefinition.mesh = new Mesh(gpuCameraRenderer, {
      label: instancesDefinition.name + ' mesh',
      geometry: instancesDefinition.geometry,
      frustumCulling: false, // it's done on the GPU!
      renderBundle,
      bindings: [instancesDefinition.modelBinding, culledInstancesVertexBinding, debugCameraBinding],
      shaders: {
        vertex: {
          code: vs,
        },
        fragment: {
          code: fs,
        },
      },
      uniforms: {
        debug: {
          struct: {
            camera: {
              type: 'f32',
              value: 0,
            },
          },
        },
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: instancesDefinition.color,
            },
          },
        },
      },
    })
  })

  let isDebugCam = false
  const debugCameraButton = document.querySelector('#debug-camera-button')
  debugCameraButton.addEventListener('click', () => {
    isDebugCam = !isDebugCam

    instancesDefinitions.forEach((instancesDefinition) => {
      if (instancesDefinition.mesh) {
        instancesDefinition.mesh.uniforms.debug.camera.value = isDebugCam ? 1 : 0
      }
    })

    debugCameraButton.textContent = isDebugCam ? 'Use main camera' : 'Use debug camera'
  })
})
