import { DOMMesh, DOMMeshBaseParams } from './DOMMesh'
import { PlaneGeometryParams } from '../../core/geometries/PlaneGeometry'
import { RectCoords } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { DOMElementBoundingRect } from '../../core/DOMElement'
import { Texture } from '../../core/textures/Texture'
import { Vec2 } from '../../math/Vec2'

// extends DOMMeshParams instead?
interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {}

export class Plane extends DOMMesh {
  type: string

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement | string, parameters?: PlaneParams)

  mouseToPlaneCoords(mouseCoords: Vec2): Vec2
}
