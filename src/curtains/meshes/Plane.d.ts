import { DOMMesh, DOMMeshBaseParams } from './DOMMesh'
import { PlaneGeometryParams } from '../geometry/PlaneGeometry'
import { RectCoords } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { DOMElementBoundingRect } from '../../core/DOMElement'
import { Texture } from '../../core/Texture'

// extends DOMMeshParams instead?
interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {
  // frustum / view culling
  alwaysDraw?: boolean
  drawCheckMargins?: RectCoords

  // scroll
  watchScroll?: boolean
}

export class Plane extends DOMMesh {
  type: string
  // options: {
  //   label: string
  // }
  alwaysDraw: boolean
  drawCheckMargins: RectCoords

  // scroll
  watchScroll: boolean

  // callbacks
  onRender: () => void

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement | string, parameters?: PlaneParams)

  resize(boundingRect?: DOMElementBoundingRect)

  //setInitSources()

  onTextureCreated(texture: Texture)

  //render(pass: GPURenderPassEncoder)

  destroy()
}
