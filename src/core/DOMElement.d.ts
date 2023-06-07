import ResizeManager from '../utils/ResizeManager'

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
  element: null | undefined | string | HTMLElement
  isResizing: boolean
  onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
  resizeManager: ResizeManager // TODO
  _boundingRect: DOMElementBoundingRect

  get boundingRect(): DOMElementBoundingRect
  set boundingRect(boundingRect: DOMElementBoundingRect)

  updateScrollPosition(lastXDelta: number, lastYDelta: number)
  setSize(contentRect: DOMElementBoundingRect | null)

  destroy()

  constructor({
    element,
    onSizeChanged,
    onPositionChanged,
  }: {
    element: string | HTMLElement
    onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
    renderingScale?: (boundingRect: DOMElementBoundingRect | null) => void | null
  })
}
