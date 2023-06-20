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

// TODO this is not working if origin.world && position.document are not declared in Object3DTransforms
// altho it seems to be working here?
// https://www.typescriptlang.org/play?module=1#code/JYOwLgpgTgZghgYwgAgGoQQZmQbwLABQyxyAHgFzIgCuAtgEbSEnICelNDTRJAXh3UZRCAX0KFQkWIhQB5egCsMYTABEAKlDggAzjAD2UWjtzNkUfWDhhg+kJXRYzh4AHNQlfD2K19AEwgAGwcMTDMxHgAHfR1gGztPM2IAd0NAvxCnHgiIiXBoeCRkVVkAWXklBBUNLV0DIxMIUkgQPxNZWjiAHgrlNU1tPUNjABpkAHIXdxBx5AAfCejY+JmAPlMeKY8Nll8A4LRQpORUqHTMsOyzJbjbex2SU-PDrJY-fQQ6CHAL8NFxAgIQJwHTtRR9VQPYhgWpDBqUXpVfqw+rGAEsBB2HQw6hVQwACgAlFCWMgwAALYA6AB0MMGqJMAF4SaSSBYrCtEt5WTyKMgAAwjY480nsAVC7kilj8AXCnkiCVSkhbe5eJWsvZBLnqqV8wVynXEMX6yWG4gy-kGqURHUKq0sG6clnqp4ZZ1mvWKs2iygm72ki32+VB4g24Pc3Lc1wQMDIR13IkXd3mGPUKAgMmUml0urDGnxuzU13HHIAoEgkwABQslUgfkR1WQTRabWQDbUJLArEiEAA-JRsVBQK5kMzxtX9LWIH5xuiSJjdDi8VAicmdNQeyvCSX-gRCOXQcUyu3Ic3vq2J1P6+CkZC1SQc3DjABCSglco36oDXMNOfEBeDriYAEsS96suum5En+pIUlStIonm1IqkWaR+KOyYsJ6IZsL6XpKoGpqhtBLCwdmCENNSBYgNS7yfLQ3yxsyYG6rh2HGnhUoESKYZEXuUYxsgtFfOAlYxLcdiJi82DMSwUCpummZwY+DKUWJKw0R8wlgDuBCRgBsb6J+HbMiAEDJG2RmqFBgJYrG7y0Ce6GmeZ74ntZ+5YvogQQNSgT6K4+KGbWahjPZJ7wfSeaEkAA
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

// TODO check https://stackoverflow.com/a/71359409/13354068
// export const DOMObject3D: Omit<typeof ProjectedObject3D, 'transforms'> & {
//   new (...args: ConstructorParameters<typeof ProjectedObject3D>): InstanceType<typeof DOMObject3DClass>
//   transforms: DOMObject3DTransforms
// }
