/**
 * Really basic 2D vector class used for vector calculations
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Vector2.js
 * @see http://glmatrix.net/docs/vec2.js.html
 */
export class Vec2 {
  /** The type of the {@link Vec2} */
  type: string
  /** X component of our {@link Vec2} */
  private _x: number
  /** Y component of our {@link Vec2} */
  private _y: number

  /** function assigned to the {@link onChange} callback */
  _onChangeCallback?(): void

  /**
   * Vec2 constructor
   * @param x - X component of our {@link Vec2}
   * @param y - Y component of our {@link Vec2}
   */
  constructor(x = 0, y = x) {
    this.type = 'Vec2'

    this._x = x
    this._y = y
  }

  /**
   * Get the X component of the {@link Vec2}
   */
  get x(): number {
    return this._x
  }

  /**
   * Set the X component of the {@link Vec2}
   * Can trigger {@link onChange} callback
   * @param value - X component to set
   */
  set x(value: number) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Get the Y component of the {@link Vec2}
   */
  get y(): number {
    return this._y
  }

  /**
   * Set the Y component of the {@link Vec2}
   * Can trigger {@link onChange} callback
   * @param value - Y component to set
   */
  set y(value: number) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Called when at least one component of the {@link Vec2} has changed
   * @param callback - callback to run when at least one component of the {@link Vec2} has changed
   * @returns - our {@link Vec2}
   */
  onChange(callback: () => void): Vec2 {
    if (callback) {
      this._onChangeCallback = callback
    }

    return this
  }

  /**
   * Set the {@link Vec2} from values
   * @param x - new X component to set
   * @param y - new Y component to set
   * @returns - this {@link Vec2} after being set
   */
  set(x = 0, y = x): Vec2 {
    this.x = x
    this.y = y

    return this
  }

  /**
   * Add a {@link Vec2} to this {@link Vec2}
   * @param vector - {@link Vec2} to add
   * @returns - this {@link Vec2} after addition
   */
  add(vector: Vec2 = new Vec2()): Vec2 {
    this.x += vector.x
    this.y += vector.y

    return this
  }

  /**
   * Add a scalar to all the components of this {@link Vec2}
   * @param value - number to add
   * @returns - this {@link Vec2} after addition
   */
  addScalar(value = 0): Vec2 {
    this.x += value
    this.y += value

    return this
  }

  /**
   * Subtract a {@link Vec2} from this {@link Vec2}
   * @param vector - {@link Vec2} to subtract
   * @returns - this {@link Vec2} after subtraction
   */
  sub(vector: Vec2 = new Vec2()): Vec2 {
    this.x -= vector.x
    this.y -= vector.y

    return this
  }

  /**
   * Subtract a scalar to all the components of this {@link Vec2}
   * @param value - number to subtract
   * @returns - this {@link Vec2} after subtraction
   */
  subScalar(value = 0): Vec2 {
    this.x -= value
    this.y -= value

    return this
  }

  /**
   * Multiply a {@link Vec2} with this {@link Vec2}
   * @param vector - {@link Vec2} to multiply with
   * @returns - this {@link Vec2} after multiplication
   */
  multiply(vector: Vec2 = new Vec2(1)): Vec2 {
    this.x *= vector.x
    this.y *= vector.y

    return this
  }

  /**
   * Multiply all components of this {@link Vec2} with a scalar
   * @param value - number to multiply with
   * @returns - this {@link Vec2} after multiplication
   */
  multiplyScalar(value = 1): Vec2 {
    this.x *= value
    this.y *= value

    return this
  }

  /**
   * Copy a {@link Vec2} into this {@link Vec2}
   * @param vector - {@link Vec2} to copy
   * @returns - this {@link Vec2} after copy
   */
  copy(vector: Vec2 = new Vec2()): Vec2 {
    this.x = vector.x
    this.y = vector.y

    return this
  }

  /**
   * Clone this {@link Vec2}
   * @returns - cloned {@link Vec2}
   */
  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  /**
   * Apply max values to this {@link Vec2} components
   * @param vector - {@link Vec2} representing max values
   * @returns - {@link Vec2} with max values applied
   */
  max(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.max(this.x, vector.x)
    this.y = Math.max(this.y, vector.y)

    return this
  }

  /**
   * Apply min values to this {@link Vec2} components
   * @param vector - {@link Vec2} representing min values
   * @returns - {@link Vec2} with min values applied
   */
  min(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.min(this.x, vector.x)
    this.y = Math.min(this.y, vector.y)

    return this
  }

  /**
   * Clamp this {@link Vec2} components by min and max {@link Vec2} vectors
   * @param min - minimum {@link Vec2} components to compare with
   * @param max - maximum {@link Vec2} components to compare with
   * @returns - clamped {@link Vec2}
   */
  clamp(min: Vec2 = new Vec2(), max: Vec2 = new Vec2()): Vec2 {
    this.x = Math.max(min.x, Math.min(max.x, this.x))
    this.y = Math.max(min.y, Math.min(max.y, this.y))

    return this
  }

  /**
   * Check if 2 {@link Vec2} are equal
   * @param vector - {@link Vec2} to compare
   * @returns - whether the {@link Vec2} are equals or not
   */
  equals(vector: Vec2 = new Vec2()): boolean {
    return this.x === vector.x && this.y === vector.y
  }

  /**
   * Get the square length of this {@link Vec2}
   * @returns - square length of this {@link Vec2}
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y
  }

  /**
   * Get the length of this {@link Vec2}
   * @returns - length of this {@link Vec2}
   */
  length(): number {
    return Math.sqrt(this.lengthSq())
  }

  /**
   * Normalize this {@link Vec2}
   * @returns - normalized {@link Vec2}
   */
  normalize(): Vec2 {
    // normalize
    let len = this.x * this.x + this.y * this.y
    if (len > 0) {
      len = 1 / Math.sqrt(len)
    }
    this.x *= len
    this.y *= len

    return this
  }

  /**
   * Calculate the dot product of 2 {@link Vec2}
   * @param vector - {@link Vec2} to use for dot product
   * @returns - dot product of the 2 {@link Vec2}
   */
  dot(vector: Vec2 = new Vec2()): number {
    return this.x * vector.x + this.y * vector.y
  }

  /**
   * Calculate the linear interpolation of this {@link Vec2} by given {@link Vec2} and alpha, where alpha is the percent distance along the line
   * @param vector - {@link Vec2} to interpolate towards
   * @param [alpha=1] - interpolation factor in the [0, 1] interval
   * @returns - this {@link Vec2} after linear interpolation
   */
  lerp(vector: Vec2 = new Vec2(), alpha = 1): Vec2 {
    this.x += (vector.x - this.x) * alpha
    this.y += (vector.y - this.y) * alpha

    return this
  }
}
