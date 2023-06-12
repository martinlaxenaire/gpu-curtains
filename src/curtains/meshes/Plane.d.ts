import { DOMMesh } from './DOMMesh'
import { MeshBindings, MeshShadersOptions } from '../../core/meshes/Mesh'
import { PlaneGeometryProps } from '../geometry/PlaneGeometry'
import { RectCoords } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { DOMElementBoundingRect } from '../../core/DOMElement'
import { Texture } from '../../core/Texture'

interface PlaneProps extends PlaneGeometryProps {
  label?: string
  shaders?: MeshShadersOptions
  bindings?: MeshBindings

  // frustum / view culling
  alwaysDraw?: boolean
  visible?: boolean
  drawCheckMargins?: RectCoords

  // sources
  autoloadSources?: boolean

  // scroll
  watchScroll?: boolean

  // callbacks
  onRender?: () => void
}

export class Plane extends DOMMesh {
  type: string
  // options: {
  //   label: string
  // }
  alwaysDraw: boolean
  visible: boolean
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
    }: PlaneProps
  )

  resize(boundingRect?: DOMElementBoundingRect)

  setInitSources()

  onTextureCreated(texture: Texture)

  //render(pass: GPURenderPassEncoder)

  destroy()
}
