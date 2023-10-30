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

export interface DOMPosition {
  x: number
  y: number
}

export interface DOMElementBoundingRect extends RectCoords, RectBBox, DOMPosition {}

/**
 * DOMElement class:
 * Used to track a DOM Element size and position by using a resize observer provided by {@see ResizeManager}
 */
export class DOMElement {
  #throttleResize: null | ReturnType<typeof setTimeout> = null

  element: HTMLElement
  isResizing: boolean
  onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  resizeManager: ResizeManager
  _boundingRect: DOMElementBoundingRect

  /**
   * DOMElement constructor
   * @param {Object=} parameters - parameters used to create our DOMElement
   * @param {HTMLElement=} parameters.element - DOM HTML element to track
   * @param {function=} parameters.onSizeChanged - callback to run when element's size changed
   * @param {function=} parameters.onPositionChanged - callback to run when element's position changed
   */
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

  /**
   * Check whether 2 bounding rectangles are equals
   * @param {(DOMRect | DOMElementBoundingRect)} rect1 - first bounding rectangle
   * @param {(DOMRect | DOMElementBoundingRect)} rect2 - second bounding rectangle
   * @returns {boolean}
   */
  compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean {
    return !['x', 'y', 'left', 'top', 'right', 'bottom', 'width', 'height'].some((k) => rect1[k] !== rect2[k])
  }

  /**
   * Get or set our element's bounding rectangle
   * @readonly
   * @type {DOMElementBoundingRect}
   */
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

  /**
   * Update our element bounding rectangle because the scroll position has changed
   * @param {number} lastXDelta - delta along X axis
   * @param {number} lastYDelta - delta along Y axis
   */
  // TODO use DOMPosition object instead!
  updateScrollPosition(lastXDelta: number, lastYDelta: number) {
    if (this.isResizing) return

    this._boundingRect.top += lastYDelta
    this._boundingRect.left += lastXDelta

    if (lastXDelta || lastYDelta) {
      this.onPositionChanged(this.boundingRect)
    }
  }

  /**
   * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
   * @param {DOMElementBoundingRect=} boundingRect - new bounding rectangle
   */
  setSize(boundingRect: DOMElementBoundingRect | null = null) {
    if (!this.element) return
    // only throttle if we have set our first value
    this.isResizing = !!this.boundingRect

    this.boundingRect = boundingRect ?? this.element.getBoundingClientRect()

    // TODO
    this.#throttleResize = setTimeout(() => {
      this.isResizing = false
      this.#throttleResize = null
    }, 50)
  }

  /**
   * Destroy our DOMElement - remove from resize observer and clear throttle timeout
   */
  destroy() {
    this.resizeManager.unobserve(this.element)

    if (this.#throttleResize) {
      clearTimeout(this.#throttleResize)
    }
  }
}
