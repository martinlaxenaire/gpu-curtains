import { Box3 } from '../../math/Box3'
import { Mat4 } from '../../math/Mat4'
import { DOMElementBoundingRect } from '../DOMElement'
import { RectCoords } from '../../curtains/objects3D/DOMObject3D'

interface DOMFrustumParams {
  boundingBox?: Box3
  modelViewProjectionMatrix?: Mat4
  containerBoundingRect?: DOMElementBoundingRect
  DOMFrustumMargins?: RectCoords
  onReEnterView?: () => void
  onLeaveView?: () => void
}

export class DOMFrustum {
  boundingBox: Box3
  modelViewProjectionMatrix: Mat4

  containerBoundingRect: DOMElementBoundingRect
  DOMFrustumMargins: RectCoords
  projectedBoundingRect: DOMElementBoundingRect

  onReEnterView: () => void
  onLeaveView: () => void

  isIntersecting: boolean
  shouldUpdate: boolean

  constructor({
    boundingBox,
    modelViewProjectionMatrix,
    containerBoundingRect,
    DOMFrustumMargins,
    onReEnterView,
    onLeaveView,
  }: DOMFrustumParams)

  setContainerBoundingRect(boundingRect: DOMElementBoundingRect)

  get DOMFrustumBoundingRect(): RectCoords

  computeProjectedToDocumentCoords()
  intersectsContainer()
}
