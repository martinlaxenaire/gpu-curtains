import {
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  MediaTexture,
  Mesh,
  Object3D,
  Vec3,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const systemSize = 15

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
  const gpuFrontCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas-front'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0.1,
      far: systemSize * 6,
    },
  })

  // create the back renderer
  const gpuBackCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas-back'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0.1,
      far: systemSize * 6,
    },
  })

  gpuFrontCameraRenderer.camera.position.z = systemSize * 3
  gpuBackCameraRenderer.camera.position.z = systemSize * 3

  const texturedFragmentShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
      return textureSample(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  for (let i = 0; i < 15; i++) {
    // just so you can see that we can update a mesh renderer
    // even if it has textures
    // everything's handled internally!
    const useTexture = Math.random() > 0.5

    let texture = null

    if (useTexture) {
      texture = new MediaTexture(gpuBackCameraRenderer, {
        label: 'Mesh texture',
        name: 'meshTexture',
        placeholderColor: Math.random() > 0.5 ? [0, 255, 255, 255] : [255, 0, 255, 255],
      })

      texture.loadImage('https://picsum.photos/720/720?random=' + i)
    }

    // create a different pivot for each satellite
    const pivot = new Object3D()
    // set back renderer scene as default parent
    pivot.parent = gpuBackCameraRenderer.scene

    // set the quaternion axis order
    pivot.quaternion.setAxisOrder('ZYX')
    // random init rotationMatrix values
    pivot.rotation.y = Math.random() * Math.PI * 2
    pivot.rotation.z = Math.random() * Math.PI * 2

    // renderers will be updated in the render loop based on world position
    const cubeMesh = new Mesh(gpuBackCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
      ...(useTexture && {
        textures: [texture],
        shaders: {
          fragment: {
            code: texturedFragmentShader,
          },
        },
      }),
    })

    // now add the satellite to our pivot
    cubeMesh.parent = pivot

    cubeMesh.scale.set(1.5)

    // random distance
    cubeMesh.position.x = systemSize * 0.625 + Math.random() * systemSize * 0.5

    // random rotationMatrix speed
    const rotationSpeed = new Vec3(
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5) // pivot rotationMatrix speed
    )

    const currentWorldPosition = new Vec3()
    // get current world position
    cubeMesh.worldMatrix.getTranslation(currentWorldPosition)
    const lastWorldPosition = currentWorldPosition.clone()

    cubeMesh
      .onBeforeRender(() => {
        cubeMesh.rotation.x += rotationSpeed.x
        cubeMesh.rotation.z += rotationSpeed.y

        // rotate the pivot
        pivot.rotation.y += rotationSpeed.z
      })
      .onAfterRender(() => {
        // we're using onAfterRender here to have fresh translations
        // after the scene has updated the matrix stack

        // update current world position
        cubeMesh.worldMatrix.getTranslation(currentWorldPosition)

        // switching renderers at runtime based on depth position!
        if (lastWorldPosition.z <= 0 && currentWorldPosition.z > 0) {
          cubeMesh.setRenderer(gpuFrontCameraRenderer)
          // update the mesh pivot parent as well
          pivot.parent = gpuFrontCameraRenderer.scene
        }

        if (lastWorldPosition.z >= 0 && currentWorldPosition.z < 0) {
          cubeMesh.setRenderer(gpuBackCameraRenderer)
          // update the mesh pivot parent as well
          pivot.parent = gpuBackCameraRenderer.scene
        }

        // update last world position for next render depth comparison
        cubeMesh.worldMatrix.getTranslation(lastWorldPosition)
      })
  }
})
