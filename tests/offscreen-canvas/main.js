import { init, resize } from './init.js'

// based on https://threejs.org/examples/webgl_worker_offscreencanvas.html
window.addEventListener('load', async () => {
  const canvases = document.querySelectorAll('.canvas')

  canvases.forEach((canvas) => {
    const isOffscreen = canvas.getAttribute('id').includes('offscreen')

    if (!isOffscreen) {
      init({
        canvas,
        label: 'Regular renderer',
        pixelRatio: 1,
      })

      window.addEventListener('resize', () => {
        const container = canvas.closest('.canvas-container')
        const boundingRect = container.getBoundingClientRect()

        resize({ width: boundingRect.width, height: boundingRect.height })
      })
    } else {
      const boundingRect = canvas.getBoundingClientRect()
      const offscreen = canvas.transferControlToOffscreen()

      let url = new URL('tests/offscreen-canvas/worker.js', window.location.origin)
      const worker = new Worker(url.toString(), { type: 'module' })

      worker.postMessage(
        {
          type: 'init',
          canvas: offscreen,
          label: 'Offscreen renderer',
          width: boundingRect.width,
          height: boundingRect.height,
          pixelRatio: 1,
        },
        [offscreen]
      )

      window.addEventListener('resize', () => {
        const container = canvas.closest('.canvas-container')
        const boundingRect = container.getBoundingClientRect()

        worker.postMessage({
          type: 'resize',
          width: boundingRect.width,
          height: boundingRect.height,
        })
      })
    }
  })

  let interval = null
  const result = document.getElementById('jank-result')
  const button = document.getElementById('jank-button')

  const jank = () => {
    let number = 0

    for (let i = 0; i < 10000000; i++) {
      number += Math.random()
    }

    result.textContent = number
  }

  button.addEventListener('click', () => {
    if (interval === null) {
      interval = setInterval(jank, 1000 / 60)

      button.textContent = 'Stop jank'
      button.classList.add('active')
    } else {
      clearInterval(interval)
      interval = null

      button.textContent = 'Start jank'
      button.classList.remove('active')
      result.textContent = '0'
    }
  })
})
