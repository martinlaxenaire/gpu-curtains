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

    this.onSizeChanged = onSizeChanged
    this.onPositionChanged = onPositionChanged

    this.resizeManager = ResizeManager

    this.resizeManager.observe({
      element: this.element,
      callback: () => this.setSize(),
    })

    // do it right away on init
    this.scroll = {
      top: window.pageYOffset,
      left: window.pageXOffset,
    }

    this.setSize()
  }

  get boundingRect() {
    // return {
    //   top: this._boundingRect.top - this.scroll.top,
    //   right: this._boundingRect.right + this.scroll.left,
    //   bottom: this._boundingRect.bottom + this.scroll.top,
    //   left: this._boundingRect.left - this.scroll.left,
    //   width: this._boundingRect.width,
    //   height: this._boundingRect.height,
    //   x: this._boundingRect.x - this.scroll.left,
    //   y: this._boundingRect.y - this.scroll.top,
    // }
    return this._boundingRect
  }

  set boundingRect(boundingRect) {
    // this._boundingRect = boundingRect
    // this.onSizeChanged(this.boundingRect)

    this._boundingRect = {
      top: boundingRect.top + this.scroll.top,
      right: boundingRect.right,
      bottom: boundingRect.bottom,
      left: boundingRect.left + this.scroll.left,
      width: boundingRect.width,
      height: boundingRect.height,
      x: boundingRect.x,
      y: boundingRect.y,
    }
    this.onSizeChanged(this._boundingRect)
  }

  updateScrollPosition(lastXDelta, lastYDelta) {
    // this.scroll.top -= lastYDelta
    // this.scroll.left -= lastXDelta
    //
    // this.onPositionChanged(this.boundingRect)

    // TODO dirty??
    if (this.scroll.top === 0 && lastYDelta) {
      this.scroll.top = -lastYDelta
      lastYDelta = 0
    }

    if (this.scroll.left === 0 && lastYDelta) {
      this.scroll.left = -lastXDelta
      lastXDelta = 0
    }

    this._boundingRect.top += lastYDelta
    this._boundingRect.left += lastXDelta

    this.onPositionChanged(this._boundingRect)
  }

  setSize(contentRect) {
    this.boundingRect = contentRect ?? this.element.getBoundingClientRect()
  }
}
