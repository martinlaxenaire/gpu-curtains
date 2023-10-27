import { resizeManager } from '../../utils/ResizeManager'
import { throwError } from '../../utils/utils'
import { ResizeManager } from '../../utils/ResizeManager'

export interface RectCoords {
  top: number
  right: number
  bottom: number
  left: number
}

export interface RectBBox {
  width: number
  height: number
  top: number
  left: number
}

export interface DOMElementBoundingRect extends RectCoords, RectBBox {
  x: number
  y: number
}

export class DOMElement {
  #throttleResize: null | ReturnType<typeof setTimeout> = null

  element: HTMLElement
  isResizing: boolean
  onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  resizeManager: ResizeManager
  _boundingRect: DOMElementBoundingRect

  constructor(
    {
      element = document.body,
      onSizeChanged = (boundingRect = null) => {
        /* allow empty callback */
      },
      onPositionChanged = (boundingRect = null) => {
        /* allow empty callback */
      },
    } = {} as {
      element?: string | HTMLElement
      onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
      onPositionChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
    }
  ) {
    if (typeof element === 'string') {
      this.element = document.querySelector(element)

      if (!this.element) {
        const notFoundEl = typeof element === 'string' ? `'${element}' selector` : `${element} HTMLElement`
        throwError(`DOMElement: corresponding ${notFoundEl} not found.`)
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

  compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean {
    return !['x', 'y', 'left', 'top', 'right', 'bottom', 'width', 'height'].some((k) => rect1[k] !== rect2[k])
  }

  get boundingRect(): DOMElementBoundingRect {
    return this._boundingRect
  }

  set boundingRect(boundingRect: DOMElementBoundingRect) {
    const isSameRect = !!this.boundingRect && this.compareBoundingRect(boundingRect, this.boundingRect)

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

    if (!isSameRect) {
      this.onSizeChanged(this.boundingRect)
    }
  }

  updateScrollPosition(lastXDelta: number, lastYDelta: number) {
    if (this.isResizing) return

    this._boundingRect.top += lastYDelta
    this._boundingRect.left += lastXDelta

    if (lastXDelta || lastYDelta) {
      this.onPositionChanged(this.boundingRect)
    }
  }

  setSize(contentRect: DOMElementBoundingRect | null = null) {
    if (!this.element) return
    // only throttle if we have set our first value
    this.isResizing = !!this.boundingRect

    this.boundingRect = contentRect ?? this.element.getBoundingClientRect()

    // TODO
    this.#throttleResize = setTimeout(() => {
      this.isResizing = false
      this.#throttleResize = null
    }, 50)
  }

  destroy() {
    this.resizeManager.unobserve(this.element)

    if (this.#throttleResize) {
      clearTimeout(this.#throttleResize)
    }
  }
}
