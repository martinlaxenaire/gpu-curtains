// import { resizeManager, ResizeManager } from '../../utils/ResizeManager'

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

// export class DOMElement {
//   #throttleResize: null | ReturnType<typeof setTimeout>
//
//   element: HTMLElement
//   isResizing: boolean
//   onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
//   onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null
//   resizeManager: typeof ResizeManager
//   _boundingRect: DOMElementBoundingRect
//
//   constructor({
//     element,
//     onSizeChanged,
//     onPositionChanged,
//   }?: {
//     element?: string | HTMLElement
//     onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
//     onPositionChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null
//   })
//
//   compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean
//   get boundingRect(): DOMElementBoundingRect
//   set boundingRect(boundingRect: DOMElementBoundingRect)
//
//   updateScrollPosition(lastXDelta: number, lastYDelta: number)
//   setSize(contentRect?: DOMElementBoundingRect | null)
//
//   destroy()
// }
