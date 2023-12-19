import { getPageContent, isBackNavigation, onLinkNavigate, transitionHelper } from './view-transitions-api-utils.js'
import { GPUCurtains, Texture, Plane } from '../../dist/gpu-curtains.js'
import { TestRenderTargets } from './TestRenderTargets.js'
import { TestPingPong } from './TestPingPong.js'
import { TestComputePasses } from './TestComputePasses.js'

window.addEventListener('DOMContentLoaded', async () => {
  // curtains
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
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
