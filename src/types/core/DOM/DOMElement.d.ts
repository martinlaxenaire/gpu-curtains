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
