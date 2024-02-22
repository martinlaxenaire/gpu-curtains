import { getPageContent, onLinkNavigate } from './view-transitions-api-utils.js'
import { TestRenderTargets } from './TestRenderTargets.js'
import { TestPingPong } from './TestPingPong.js'
import { TestComputePasses } from './TestComputePasses.js'

// Goal of this test is to check if various objects remove() work well
// and if there's no memory leaks
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCurtains } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
  })

  await gpuCurtains.setDevice()

  let currentTestInstance

  const setCurrentTestInstance = () => {
    const page = document.querySelector('#page')

    if (page.classList.contains('render-targets')) {
      currentTestInstance = new TestRenderTargets({ gpuCurtains })
    } else if (page.classList.contains('ping-pong')) {
      currentTestInstance = new TestPingPong({ gpuCurtains })
    } else if (page.classList.contains('compute')) {
      currentTestInstance = new TestComputePasses({ gpuCurtains })
    }
  }

  setCurrentTestInstance()

  // navigation
  // https://glitch.com/edit/#!/simple-set-demos?path=2-slow-cross-fade%2Fscript.js%3A1%3A0
  onLinkNavigate(async ({ toPath }) => {
    // first remove planes
    currentTestInstance?.destroy()
    currentTestInstance = null

    const content = await getPageContent(toPath)

    startViewTransition(() => {
      // Convert the HTML string into a document object
      const parser = new DOMParser()
      const newDocument = parser.parseFromString(content, 'text/html')
      const currentPage = document.querySelector('#page')
      const newPage = newDocument.querySelector('#page')

      currentPage.replaceWith(newPage)

      setCurrentTestInstance()
    })
  })

  // A little helper function like this is really handy
  // to handle progressive enhancement.
  const startViewTransition = (callback) => {
    if (!document.startViewTransition) {
      callback()
      return
    }

    document.startViewTransition(callback)
  }
})
