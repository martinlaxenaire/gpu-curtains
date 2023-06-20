import { Vec3 } from './Vec3'
import { Mat4 } from './Mat4'

declare const points: Vec3[]

export class Box3 {
  min: Vec3
  max: Vec3

  constructor(min?: Vec3, max?: Vec3)

  set(min?: Vec3, max?: Vec3): Box3

  clone(): Box3

  getCenter(): Vec3
  getSize(): Vec3

  applyMat4(matrix?: Mat4): Box3
}