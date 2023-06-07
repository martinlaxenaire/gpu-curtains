import { Vec3 } from './Vec3'

type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

export class Quat {
  type: string
  elements: Float32Array
  axisOrder: AxisOrder

  constructor(elements?: Float32Array, axisOrder?: AxisOrder)

  setFromArray(array?: Float32Array | Array<number>): Quat
  setAxisOrder(axisOrder?: AxisOrder): Quat

  copy(quaternion?: Quat): Quat
  clone(): Quat
  equals(quaternion?: Quat): boolean

  setFromVec3(vector?: Vec3): Quat
}
