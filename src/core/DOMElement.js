import ResizeManager from '../utils/ResizeManager'

export class DOMElement {
  constructor({ element, onSizeChanged = () => {}, onPositionChanged = () => {} } = {}) {
    if (!element) return

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

    this.resizeManager = ResizeManager

    this.resizeManager.observe({
      element: this.element,
      callback: () => this.setSize(),
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
    this.onSizeChanged(this._boundingRect)
  }

  updateScrollPosition(lastXDelta, lastYDelta) {
    if (this.isResizing) return

    this._boundingRect.top += lastYDelta
    this._boundingRect.left += lastXDelta

    this.onPositionChanged(this._boundingRect)
  }

  setSize(contentRect) {
    this.isResizing = true
    this.boundingRect = contentRect ?? this.element.getBoundingClientRect()

    setTimeout(() => {
      this.isResizing = false
    }, 50)
  }

  destroy() {
    // TODO use
  }
}
