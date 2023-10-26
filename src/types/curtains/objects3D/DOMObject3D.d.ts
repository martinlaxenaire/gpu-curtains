import { RectBBox } from '../../core/DOM/DOMElement'
import { Vec3 } from '../../../math/Vec3'
import { Object3DTransforms } from '../../core/objects3D/Object3D'

export interface DOMObject3DSize {
  world: RectBBox
  document: RectBBox
}

export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
  origin: {
    model: Vec3
    world: Vec3
  }
  position: {
    world: Vec3
    document: Vec3
  }
}

export interface DOMObject3DParams {
  watchScroll: boolean
}
