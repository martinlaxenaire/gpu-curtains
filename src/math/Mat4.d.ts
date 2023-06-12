import { Vec3 } from './Vec3'
import { Quat } from './Quat'

export class Mat4 {
  type: string
  elements: Float32Array

  constructor(elements?: Float32Array)

  set(
    n11: number,
    n12: number,
    n13: number,
    n14: number,
    n21: number,
    n22: number,
    n23: number,
    n24: number,
    n31: number,
    n32: number,
    n33: number,
    n34: number,
    n41: number,
    n42: number,
    n43: number,
    n44: number
  ): Mat4
  identity(): Mat4
  setFromArray(array?: Float32Array | Array<number>): Mat4
  copy(matrix?: Mat4): Mat4
  clone(): Mat4
  multiply(matrix?: Mat4): Mat4
  getInverse(): Mat4
  translate(vector?: Vec3): Mat4
  scale(vector?: Vec3): Mat4
  setFromQuaternion(quaternion?: Quat): Mat4
  compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4
  composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4
}
