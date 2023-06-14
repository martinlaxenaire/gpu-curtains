import { Mat4 } from './Mat4'
import { Quat } from './Quat'
import { Camera } from '../core/camera/Camera'

export class Vec3 {
  type: string
  _x: number
  _y: number
  _z: number

  constructor(x?: number, y?: number, z?: number)

  public get x(): number
  public get y(): number
  public get z(): number
  public set(x: number)
  public set(y: number)
  public set(z: number)
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
