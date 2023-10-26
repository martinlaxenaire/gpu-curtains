/***
 Here we create a ScrollManager class object
 This keeps track of our scroll position, scroll deltas and triggers an onScroll callback
 Could either listen to the native scroll event or be hooked to any scroll (natural or virtual) scroll event

 params:
 @xOffset (float): scroll along X axis
 @yOffset (float): scroll along Y axis
 @lastXDelta (float): last scroll delta along X axis
 @lastYDelta (float): last scroll delta along Y axis

 @shouldWatch (bool): if the scroll manager should listen to the scroll event or not. Default to true.

 @onScroll (function): callback to execute each time the scroll values changed

 @returns {ScrollManager}: our ScrollManager class object
 ***/

export interface ScrollManagerParams {
  xOffset?: number
  yOffset?: number
  lastXDelta?: number
  lastYDelta?: number
  shouldWatch?: boolean
  onScroll?: () => void
}

export class ScrollManager {
  xOffset?: number
  yOffset?: number
  lastXDelta?: number
  lastYDelta?: number
  shouldWatch?: boolean
  onScroll?: (lastXDelta?: number, lastYDelta?: number) => void

  handler: EventListener

  constructor({
    xOffset = 0,
    yOffset = 0,
    lastXDelta = 0,
    lastYDelta = 0,

    shouldWatch = true,

    onScroll = (lastXDelta = 0, lastYDelta = 0) => {
      /* allow empty callback */
    },
  }: ScrollManagerParams = {}) {
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.lastXDelta = lastXDelta
    this.lastYDelta = lastYDelta
    this.shouldWatch = shouldWatch

    this.onScroll = onScroll

    // keep a ref to our scroll event
    this.handler = this.scroll.bind(this, true)
    if (this.shouldWatch) {
      window.addEventListener('scroll', this.handler, { passive: true })
    }
  }

  /***
   Called by the scroll event listener
   ***/
  scroll() {
    this.updateScrollValues(window.pageXOffset, window.pageYOffset)
  }

  /***
   Updates the scroll manager X and Y scroll values as well as last X and Y deltas
   Internally called by the scroll handler
   Could be called externally as well if the user wants to handle the scroll by himself

   params:
   @x (float): scroll value along X axis
   @y (float): scroll value along Y axis
   ***/
  updateScrollValues(x: number, y: number) {
    // get our scroll delta values
    const lastScrollXValue = this.xOffset
    this.xOffset = x
    this.lastXDelta = lastScrollXValue - this.xOffset

    const lastScrollYValue = this.yOffset
    this.yOffset = y
    this.lastYDelta = lastScrollYValue - this.yOffset

    if (this.onScroll) {
      this.onScroll(this.lastXDelta, this.lastYDelta)
    }
  }

  /***
   Destroy our scroll manager (just remove our event listner if it had been added previously)
   ***/
  destroy() {
    if (this.shouldWatch) {
      // passive triggers a typescript error
      // https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
      window.removeEventListener('scroll', this.handler, { passive: true } as AddEventListenerOptions &
        EventListenerOptions)
    }
  }
}
