// Goal of this is to test the different resizing behaviours of the renderer in the wild
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUDeviceManager, GPUCameraRenderer, Mesh } = await import(/* @vite-ignore */ path)

  const deviceManager = new GPUDeviceManager()

  await deviceManager.init()

  const canvasContainers = document.querySelectorAll('.canvas')
  const geometry = new BoxGeometry()

  const page = document.querySelector('#page')
  console.log(page.getBoundingClientRect(), window.innerWidth, window.devicePixelRatio)

  canvasContainers.forEach((container, index) => {
    const autoResize = container.hasAttribute('data-auto-resize')
      ? container.getAttribute('data-auto-resize') === 'true'
      : true
    const shouldResize = container.hasAttribute('data-should-resize')
      ? container.getAttribute('data-should-resize') === 'true'
      : true

    const pixelRatio = container.hasAttribute('data-pixel-ratio')
      ? parseFloat(container.getAttribute('data-pixel-ratio'))
      : 1
    const fixedSize = container.getAttribute('data-fixed-size')

    const renderer = new GPUCameraRenderer({
      deviceManager,
      container,
      pixelRatio,
      autoResize,
    })

    const mesh = new Mesh(renderer, {
      label: 'Mesh ' + index,
      geometry,
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.01
      mesh.rotation.z += 0.01
    })

    if (!autoResize && shouldResize) {
      window.addEventListener('resize', () => {
        const boundingRect = container.getBoundingClientRect()
        const { width, height } = boundingRect
        renderer.resize({ width, height })
      })
    }

    if (!!fixedSize) {
      renderer.resize({
        width: parseInt(fixedSize),
        height: parseInt(fixedSize),
      })
    }

    console.log(renderer)
  })
})
