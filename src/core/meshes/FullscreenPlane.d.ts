import MeshBaseMixin, { MeshBaseParams } from './MeshBaseMixin'
import { Renderer } from '../../types/renderer-utils'
import { RectBBox } from '../../curtains/objects3D/DOMObject3D'
import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { Vec2 } from '../../math/Vec2'

declare class EmptyClass {}

export class FullscreenPlane extends MeshBaseMixin(EmptyClass) {
  type: string

  size: {
    document: RectBBox
  }
  domElement: DOMElement

  constructor(renderer: Renderer, parameters: MeshBaseParams)

  resize(boundingRect: DOMElementBoundingRect)

  mouseToPlaneCoords(mouseCoords: Vec2): Vec2
}
