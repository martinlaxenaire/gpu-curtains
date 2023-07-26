import { resizeManager, ResizeManager } from '../utils/ResizeManager'

interface DOMElementBoundingRect {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
  x: number
  y: number
}

export class DOMElement {
  #throttleResize: null | ReturnType<typeof setTimeout>

  element: HTMLElement
  isResizing: boolean
  onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  resizeManager: typeof ResizeManager
  _boundingRect: DOMElementBoundingRect

  constructor({
    element,
    onSizeChanged,
    onPositionChanged,
  }?: {
    element?: string | HTMLElement
    onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
    onPositionChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
  })

  compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean
  get boundingRect(): DOMElementBoundingRect
  set boundingRect(boundingRect: DOMElementBoundingRect)

  updateScrollPosition(lastXDelta: number, lastYDelta: number)
  setSize(contentRect?: DOMElementBoundingRect | null)

  destroy()
}
