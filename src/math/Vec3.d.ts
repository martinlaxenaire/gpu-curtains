import { Mat4 } from './Mat4'
import { Quat } from './Quat'
import { Camera } from '../core/camera/Camera'

export class Vec3 {
  type: string

  private _x: number
  private _y: number
  private _z: number

  _onChangeCallback?(): void

  constructor(x?: number, y?: number, z?: number)

  get x(): number
  set x(value: number)

  get y(): number
  set y(value: number)

  get z(): number
  set z(value: number)

  set(x?: number, y?: number, z?: number): Vec3

  onChange(callback: () => void): Vec3

  add(vector?: Vec3): Vec3
  sub(vector?: Vec3): Vec3
  multiply(vector?: Vec3): Vec3
  copy(vector?: Vec3): Vec3
  addScalar(value?: number): Vec3
  subScalar(value?: number): Vec3
  multiplyScalar(value?: number): Vec3
  clone(): Vec3
  sanitizeNaNValuesWith(vector?: Vec3): Vec3
  max(vector?: Vec3): Vec3
  min(vector?: Vec3): Vec3
  equals(vector?: Vec3): boolean
  normalize(): Vec3
  dot(vector?: Vec3): number

  applyMat4(matrix?: Mat4): Vec3
  applyQuat(quaternion?: Quat): Vec3

  project(camera: Camera): Vec3
  unproject(camera: Camera): Vec3
}
