import { DOMMesh } from './DOMMesh'
import { MeshBaseParams, MeshBindings, MeshShadersOptions } from '../../core/meshes/Mesh'
import { PlaneGeometryParams } from '../geometry/PlaneGeometry'
import { RectCoords } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { DOMElementBoundingRect } from '../../core/DOMElement'
import { Texture } from '../../core/Texture'

interface PlaneParams extends MeshBaseParams, PlaneGeometryParams {
  // frustum / view culling
  alwaysDraw?: boolean
  drawCheckMargins?: RectCoords

  // sources
  autoloadSources?: boolean

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

  // sources
  autoloadSources: boolean

  // scroll
  watchScroll: boolean

  // callbacks
  onRender: () => void

  constructor(
    renderer: GPUCurtainsRenderer,
    element: HTMLElement | string,
    {
      label,
      shaders,
      bindings,
      widthSegments,
      heightSegments,
      alwaysDraw,
      visible,
      drawCheckMargins,
      autoloadSources,
      watchScroll,
      onRender,
    }: PlaneParams
  )

  resize(boundingRect?: DOMElementBoundingRect)

  setInitSources()

  onTextureCreated(texture: Texture)

  //render(pass: GPURenderPassEncoder)

  destroy()
}
