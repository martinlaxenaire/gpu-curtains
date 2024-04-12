let renderer

export const init = async ({ canvas, label, width, height, top = 0, left = 0, pixelRatio, isLocal = false }) => {
  const path = isLocal ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUDeviceManager, GPUCameraRenderer, BoxGeometry, Mesh } = await import(/* @vite-ignore */ path)

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
    renderer.resize({ width, height, top, left })
  }

  console.log(renderer)

  const mesh = new Mesh(renderer, {
    geometry: new BoxGeometry(),
  })

  mesh.onBeforeRender(() => {
    mesh.rotation.y += 0.01
    mesh.rotation.z += 0.01
  })
}

export const resize = ({ width, height, top = 0, left = 0 }) => {
  renderer?.resize({ width, height, top, left })
}
