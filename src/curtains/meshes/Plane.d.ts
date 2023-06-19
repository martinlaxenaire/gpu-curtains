import { DOMMesh, DOMMeshBaseParams } from './DOMMesh'
import { PlaneGeometryParams } from '../geometry/PlaneGeometry'
import { RectCoords } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { DOMElementBoundingRect } from '../../core/DOMElement'
import { Texture } from '../../core/Texture'

// extends DOMMeshParams instead?
interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {}

export class Plane extends DOMMesh {
  type: string
  // options: {
  //   label: string
  // }

  // callbacks
  //onRender: () => void

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement | string, parameters?: PlaneParams)

  //resize(boundingRect?: DOMElementBoundingRect)

  //setInitSources()

  //render(pass: GPURenderPassEncoder)

  //destroy()
}
