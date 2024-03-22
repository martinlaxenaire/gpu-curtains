import { GPUDeviceManager, GPUCameraRenderer, BoxGeometry, Mesh } from '../../src/index.ts'

let renderer

export const init = async ({ canvas, label, width, height, pixelRatio, isOffscreen = false }) => {
  const deviceManager = new GPUDeviceManager()

  await deviceManager.init()

  // render it
  const animate = () => {
    deviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  renderer = new GPUCameraRenderer({
    deviceManager,
    label,
    container: canvas,
    pixelRatio,
    autoResize: false,
  })

  if (width && height) {
    renderer.resize({ width, height })
  }

  console.log(isOffscreen, renderer)

  const mesh = new Mesh(renderer, {
    geometry: new BoxGeometry(),
  })

  mesh.onRender(() => {
    mesh.rotation.y += 0.01
    mesh.rotation.z += 0.01
  })
}

export const resize = ({ width, height }) => {
  renderer.resize({ width, height })
}
