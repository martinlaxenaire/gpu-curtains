import {
  GPUDeviceManager,
  GPUCameraRenderer,
  BoxGeometry,
  RenderTexture,
  Mesh,
  Vec2,
  Vec3,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
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
      fov: 65,
    },
  })

  const { camera } = gpuCameraRenderer

  camera.position.z = 0

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  // Fetch the 6 separate images for negative/positive x, y, z axis of a cubeMap
  // and upload it into a GPUTexture.
  // The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
  const imgSrcs = [
    './assets/posx.jpg',
    './assets/negx.jpg',
    './assets/posy.jpg',
    './assets/negy.jpg',
    './assets/posz.jpg',
    './assets/negz.jpg',
  ]

  const promises = imgSrcs.map(async (src) => {
    const response = await fetch(src)
    return createImageBitmap(await response.blob())
  })

  const imageBitmaps = await Promise.all(promises)

  const cubeMapTexture = new RenderTexture(gpuCameraRenderer, {
    name: 'cubeMapTexture',
    viewDimension: 'cube',
    visibility: 'fragment',
    fixedSize: {
      width: imageBitmaps[0].width,
      height: imageBitmaps[0].height,
    },
  })

  for (let i = 0; i < imageBitmaps.length; i++) {
    const imageBitmap = imageBitmaps[i]
    gpuCameraRenderer.device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: cubeMapTexture.texture, origin: [0, 0, i] },
      [imageBitmap.width, imageBitmap.height]
    )
  }

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()

  const cubeMapVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

     
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.direction = normalize(attributes.position);

      return vsOutput;
    }
  `

  const cubeMapFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {    
      return textureSample(cubeMapTexture, defaultSampler, fsInput.direction);
    }
  `

  const cubeMap = new Mesh(gpuCameraRenderer, {
    geometry: cubeGeometry,
    renderTextures: [cubeMapTexture],
    cullMode: 'none',
    shaders: {
      vertex: {
        code: cubeMapVs,
      },
      fragment: {
        code: cubeMapFs,
      },
    },
  })

  //--------------
  // CUBEMAP ROTATION CONTROLS
  //--------------

  // now the orbit controls
  const mouse = {
    current: new Vec2(Infinity),
    last: new Vec2(Infinity),
    delta: new Vec2(),
    isDown: false,
  }

  const targetRotation = new Vec3()

  window.addEventListener('touchstart', () => {
    mouse.isDown = true
  })
  window.addEventListener('mousedown', () => {
    mouse.isDown = true
  })

  window.addEventListener('touchend', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })
  window.addEventListener('mouseup', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })

  window.addEventListener('pointermove', (e) => {
    if (!mouse.isDown) return

    mouse.current.set(e.clientX, e.clientY)

    if (mouse.last.x === Infinity) {
      mouse.last.copy(mouse.current)
    }

    mouse.delta.set(mouse.current.x - mouse.last.x, mouse.current.y - mouse.last.y)

    targetRotation.y += mouse.delta.x * 0.005
    targetRotation.x = Math.min(Math.max(targetRotation.x + mouse.delta.y * 0.005, -Math.PI / 2), Math.PI / 2)

    mouse.last.copy(mouse.current)
  })

  cubeMap.onRender(() => {
    cubeMap.rotation.lerp(targetRotation, 0.15)
  })
})
