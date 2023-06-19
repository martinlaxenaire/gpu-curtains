import { resizeManager } from '../utils/ResizeManager'

export class DOMElement {
  constructor({
    element = document.body,
    onSizeChanged = (boundingRect = null) => {
      /* allow empty callback */
    },
    onPositionChanged = (boundingRect = null) => {
      /* allow empty callback */
    },
  } = {}) {
    if (typeof element === 'string') {
      this.element = document.querySelector(element)

      if (!this.element) {
        return
      }
    } else {
      this.element = element
    }

    this.isResizing = false

    this.onSizeChanged = onSizeChanged
    this.onPositionChanged = onPositionChanged

    this.resizeManager = resizeManager

    this.resizeManager.observe({
      element: this.element,
      callback: () => {
        this.setSize()
      },
    })

    // do it right away on init
    this.setSize()
  }

  get boundingRect() {
    return this._boundingRect
  }

  set boundingRect(boundingRect) {
    this._boundingRect = {
      top: boundingRect.top,
      right: boundingRect.right,
      bottom: boundingRect.bottom,
      left: boundingRect.left,
      width: boundingRect.width,
      height: boundingRect.height,
      x: boundingRect.x,
      y: boundingRect.y,
    }
    this.onSizeChanged(this.boundingRect)
  }

  updateScrollPosition(lastXDelta, lastYDelta) {
    if (this.isResizing) return

    this._boundingRect.top += lastYDelta
    this._boundingRect.left += lastXDelta

    this.onPositionChanged(this.boundingRect)
  }

  setSize(contentRect) {
    // only throttle if we have set our first value
    this.isResizing = !!this.boundingRect

    this.boundingRect = contentRect ?? this.element.getBoundingClientRect()

    // TODO
    setTimeout(() => {
      this.isResizing = false
    }, 50)
  }

  destroy() {
    this.resizeManager.unobserve(this.element)
  }
}
