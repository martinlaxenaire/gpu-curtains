import { DOMPosition } from '../core/DOM/DOMElement'

/**
 * Parameters used to create a {@link ScrollManager}
 */
export interface ScrollManagerParams {
  /** Current scroll position */
  scroll?: DOMPosition
  /** Last scroll deltas */
  delta?: DOMPosition
  /** Whether the {@link ScrollManager} should listen to the window scroll event or not */
  shouldWatch?: boolean
  /** Callback to execute each time the [scroll]{@link ScrollManager#scroll} values change */
  onScroll?: (delta?: DOMPosition) => void
}

/**
 * ScrollManager class:
 * Used to keep track of our scroll position, scroll deltas and trigger an onScroll callback
 * Could either listen to the native scroll event or be hooked to any scroll (natural or virtual) scroll event
 */
export class ScrollManager {
  /** Current scroll position */
  scroll: DOMPosition
  /** Last scroll deltas */
  delta: DOMPosition
  /** Whether the {@link ScrollManager} should listen to the window scroll event or not */
  shouldWatch: boolean
  /** Callback to execute each time the [scroll]{@link ScrollManager#scroll} values change */
  onScroll: (delta?: DOMPosition) => void

  /** Keep track of our scroll event listener */
  handler: EventListener

  /**
   * ScrollManager constructor
   * @param parameters - [parameters]{@link ScrollManagerParams} used to create this {@link ScrollManager}
   */
  constructor({
    scroll = { x: 0, y: 0 },
    delta = { x: 0, y: 0 },
    shouldWatch = true,
    onScroll = (delta: DOMPosition = { x: 0, y: 0 }) => {
      /* allow empty callback */
    },
  }: ScrollManagerParams = {}) {
    this.scroll = scroll
    this.delta = delta

    this.shouldWatch = shouldWatch

    this.onScroll = onScroll

    // keep a ref to our scroll event
    this.handler = this.scrollHandler.bind(this, true)
    if (this.shouldWatch) {
      window.addEventListener('scroll', this.handler, { passive: true })
    }
  }

  /**
   * Called by the scroll event listener
   */
  scrollHandler() {
    this.updateScrollValues({ x: window.pageXOffset, y: window.pageYOffset })
  }

  /**
   * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
   * Internally called by the scroll handler
   * Could be called externally as well if the user wants to handle the scroll by himself
   * @param parameters - scroll values
   * @param parameters.x - scroll value along X axis
   * @param parameters.y - scroll value along Y axis
   */
  updateScrollValues({ x, y }: DOMPosition) {
    // get our scroll delta values
    const lastScroll = this.scroll
    this.scroll = { x, y }
    this.delta = {
      x: lastScroll.x - this.scroll.x,
      y: lastScroll.y - this.scroll.y,
    }

    if (this.onScroll) {
      this.onScroll(this.delta)
    }
  }

  /**
   * Destroy our scroll manager (just remove our event listner if it had been added previously)
   */
  destroy() {
    if (this.shouldWatch) {
      // passive triggers a typescript error
      // https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
      window.removeEventListener('scroll', this.handler, { passive: true } as AddEventListenerOptions &
        EventListenerOptions)
    }
  }
}
