import { Box3 } from '../../../math/Box3'
import { Mat4 } from '../../../math/Mat4'
import { DOMElementBoundingRect, RectCoords } from './DOMElement'

export interface DOMFrustumParams {
  boundingBox?: Box3
  modelViewProjectionMatrix?: Mat4
  containerBoundingRect?: DOMElementBoundingRect
  DOMFrustumMargins?: RectCoords
  onReEnterView?: () => void
  onLeaveView?: () => void
}
