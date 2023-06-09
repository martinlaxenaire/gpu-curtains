import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { Camera } from '../../core/camera/Camera'
import { DOMElement, DOMElementBoundingRect } from '../../core/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { Object3DTransforms } from '../../core/objects3D/Object3D'

interface RectCoords {
  top: number
  right: number
  bottom: number
  left: number
}

interface RectBBox {
  width: number
  height: number
  top: number
  left: number
}

interface DOMObject3DSize {
  world: RectBBox
  document: RectBBox
}

interface DOMOBject3DTransforms extends Object3DTransforms {
  origin: {
    model: Vec3
    world: Vec3
  }
  position: {
    world: Vec3
    document: Vec3
  }
}

export class DOMObject3D extends ProjectedObject3D {
  renderer: GPUCurtainsRenderer
  camera: Camera

  size: DOMObject3DSize
  domElement: DOMElement

  transforms: DOMOBject3DTransforms

  constructor(renderer: GPUCurtainsRenderer, element: string | HTMLElement)

  updateSizeAndPosition()

  updateSizePositionAndProjection()

  resize(boundingRect?: DOMElementBoundingRect)

  getBoundingRect(): DOMElementBoundingRect

  setTransforms()

  get documentPosition(): RectBBox
  set documentPosition(value: RectBBox)

  get transformOrigin(): Vec3
  set transformOrigin(value: Vec3)

  get worldTransformOrigin()
  set worldTransformOrigin(value: Vec3)

  // TODO useless?
  updateProjectionMatrixStack()

  documentToWorldSpace(vector?: Vec3): Vec3

  setWorldSizes()
  setWorldTransformOrigin()

  updateScrollPosition(lastXDelta?: number, lastYDelta?: number)
}
