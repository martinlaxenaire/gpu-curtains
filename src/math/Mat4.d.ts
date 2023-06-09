import { Vec3 } from './Vec3'
import { Quat } from './Quat'

export class Mat4 {
  type: string
  elements: Float32Array

  constructor(elements?: Float32Array)

  setFromArray(array?: Float32Array | Array<number>): Mat4
  copy(matrix?: Mat4): Mat4
  clone(): Mat4
  multiply(matrix?: Mat4): Mat4
  getInverse(): Mat4
  translate(vector?: Vec3): Mat4
  scale(vector?: Vec3): Mat4
  rotateFromQuaternion(quaternion?: Quat): Mat4
  compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4
  composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4
}
