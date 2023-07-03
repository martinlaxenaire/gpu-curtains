export class Vec2 {
  type: string

  private _x: number
  private _y: number

  _onChangeCallback?(): void

  constructor(x?: number, y?: number)

  get x(): number
  set x(value: number)

  get y(): number
  set y(value: number)

  set(x?: number, y?: number): Vec2

  onChange(callback: () => void): Vec2

  add(vector?: Vec2): Vec2
  sub(vector?: Vec2): Vec2
  multiply(vector?: Vec2): Vec2
  copy(vector?: Vec2): Vec2
  addScalar(value?: number): Vec2
  subScalar(value?: number): Vec2
  multiplyScalar(value?: number): Vec2
  clone(): Vec2
  sanitizeNaNValuesWith(vector?: Vec2): Vec2
  max(vector?: Vec2): Vec2
  min(vector?: Vec2): Vec2
  equals(vector?: Vec2): boolean
  normalize(): Vec2
  dot(vector?: Vec2): number
  lerp(vector?: Vec2, alpha?: number): Vec2
}
