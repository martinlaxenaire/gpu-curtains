import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
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

interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
  origin: {
    model: Vec3
    world: Vec3
  }
  position: {
    world: Vec3
    document: Vec3
  }
}

interface DOMObject3DParams {
  watchScroll: boolean
}

//declare class DOMObject3DClass extends ProjectedObject3D {
export class DOMObject3D extends ProjectedObject3D {
  renderer: GPUCurtainsRenderer
  camera: Camera

  size: DOMObject3DSize
  domElement: DOMElement

  watchScroll: boolean

  transforms: DOMObject3DTransforms

  #DOMObjectWorldPosition: Vec3
  #DOMObjectWorldScale: Vec3

  constructor(renderer: GPUCurtainsRenderer, element: string | HTMLElement, parameters: DOMObject3DParams)

  updateSizeAndPosition()

  updateSizePositionAndProjection()

  resize(boundingRect?: DOMElementBoundingRect)

  get boundingRect(): DOMElementBoundingRect

  setTransforms()

  get documentPosition(): Vec3
  set documentPosition(value: Vec3)

  get worldScale(): Vec3
  get worldPosition(): Vec3

  get transformOrigin(): Vec3
  set transformOrigin(value: Vec3)

  get worldTransformOrigin()
  set worldTransformOrigin(value: Vec3)

  documentToWorldSpace(vector?: Vec3): Vec3

  setWorldSizes()
  setWorldTransformOrigin()

  updateScrollPosition(lastXDelta?: number, lastYDelta?: number)
}
