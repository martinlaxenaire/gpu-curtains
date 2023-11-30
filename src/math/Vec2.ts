/**
 * Vec2 class:
 * Really basic Vector2 class used for vector calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector2.js and http://glmatrix.net/docs/vec2.js.html
 */
export class Vec2 {
  /** The type of the {@link Vec2} */
  type: string
  /** X component of our [vector]{@link Vec2} */
  private _x: number
  /** Y component of our [vector]{@link Vec2} */
  private _y: number

  /** function assigned to the [onChange]{@link Vec2#onChange} callback */
  _onChangeCallback?(): void

  /**
   * Vec2 constructor
   * @param x=0 - X component of our [vector]{@link Vec2}
   * @param y=x - Y component of our [vector]{@link Vec2}
   */
  constructor(x = 0, y = x) {
    this.type = 'Vec2'

    this._x = x
    this._y = y
  }

  /**
   * Get/set the X component of the [vector]{@link Vec2}
   * When set, can trigger [onChange]{@link Vec2#onChange} callback
   * @readonly
   */
  get x(): number {
    return this._x
  }

  set x(value: number) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Get/set the Y component of the [vector]{@link Vec2}
   * When set, can trigger [onChange]{@link Vec2#onChange} callback
   * @readonly
   */
  get y(): number {
    return this._y
  }

  set y(value: number) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Called when at least one component of the [vector]{@link Vec2} has changed
   * @param callback - callback to run when at least one component of the [vector]{@link Vec2} has changed
   * @returns - our {@link Vec2}
   */
  onChange(callback: () => void): Vec2 {
    if (callback) {
      this._onChangeCallback = callback
    }

    return this
  }

  /**
   * Set the [vector]{@link Vec2} from values
   * @param x=0 - new X component to set
   * @param y=x - new Y component to set
   * @returns - this [vector]{@link Vec2} after being set
   */
  set(x = 0, y = x): Vec2 {
    this.x = x
    this.y = y

    return this
  }

  /**
   * Add a [vector]{@link Vec2} to this [vector]{@link Vec2}
   * @param vector - [vector]{@link Vec2} to add
   * @returns - this [vector]{@link Vec2} after addition
   */
  add(vector: Vec2 = new Vec2()): Vec2 {
    this.x += vector.x
    this.y += vector.y

    return this
  }

  /**
   * Add a scalar to all the components of this [vector]{@link Vec2}
   * @param value=0 - number to add
   * @returns - this [vector]{@link Vec2} after addition
   */
  addScalar(value = 0): Vec2 {
    this.x += value
    this.y += value

    return this
  }

  /**
   * Subtract a [vector]{@link Vec2} from this [vector]{@link Vec2}
   * @param vector - [vector]{@link Vec2} to subtract
   * @returns - this [vector]{@link Vec2} after subtraction
   */
  sub(vector: Vec2 = new Vec2()): Vec2 {
    this.x -= vector.x
    this.y -= vector.y

    return this
  }

  /**
   * Subtract a scalar to all the components of this [vector]{@link Vec2}
   * @param value=0 - number to subtract
   * @returns - this [vector]{@link Vec2} after subtraction
   */
  subScalar(value = 0): Vec2 {
    this.x -= value
    this.y -= value

    return this
  }

  /**
   * Multiply a [vector]{@link Vec2} with this [vector]{@link Vec2}
   * @param vector - [vector]{@link Vec2} to multiply with
   * @returns - this [vector]{@link Vec2} after multiplication
   */
  multiply(vector: Vec2 = new Vec2(1)): Vec2 {
    this.x *= vector.x
    this.y *= vector.y

    return this
  }

  /**
   * Multiply all components of this [vector]{@link Vec2} with a scalar
   * @param value=1 - number to multiply with
   * @returns - this [vector]{@link Vec2} after multiplication
   */
  multiplyScalar(value = 1): Vec2 {
    this.x *= value
    this.y *= value

    return this
  }

  /**
   * Copy a [vector]{@link Vec2} into this [vector]{@link Vec2}
   * @param vector - [vector]{@link Vec2} to copy
   * @returns - this [vector]{@link Vec2} after copy
   */
  copy(vector: Vec2 = new Vec2()): Vec2 {
    this.x = vector.x
    this.y = vector.y

    return this
  }

  /**
   * Clone this [vector]{@link Vec2}
   * @returns - cloned [vector]{@link Vec2}
   */
  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  /**
   * Apply max values to this [vector]{@link Vec2} components
   * @param vector - [vector]{@link Vec2} representing max values
   * @returns - [vector]{@link Vec2} with max values applied
   */
  max(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.max(this.x, vector.x)
    this.y = Math.max(this.y, vector.y)

    return this
  }

  /**
   * Apply min values to this [vector]{@link Vec2} components
   * @param vector - [vector]{@link Vec2} representing min values
   * @returns - [vector]{@link Vec2} with min values applied
   */
  min(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.min(this.x, vector.x)
    this.y = Math.min(this.y, vector.y)

    return this
  }

  /**
   * Check if 2 [vectors]{@link Vec2} are equal
   * @param vector - [vector]{@link Vec2} to compare
   * @returns - whether the [vectors]{@link Vec2} are equals or not
   */
  equals(vector: Vec2 = new Vec2()): boolean {
    return this.x === vector.x && this.y === vector.y
  }

  /**
   * Get the square length of this [vector]{@link Vec2}
   * @returns - square length of this [vector]{@link Vec2}
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y
  }

  /**
   * Get the length of this [vector]{@link Vec2}
   * @returns - length of this [vector]{@link Vec2}
   */
  length(): number {
    return Math.sqrt(this.lengthSq())
  }

  /**
   * Normalize this [vector]{@link Vec2}
   * @returns - normalized [vector]{@link Vec2}
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
   * Calculate the dot product of 2 [vectors]{@link Vec2}
   * @param vector - [vector]{@link Vec2} to use for dot product
   * @returns - dot product of the 2 [vectors]{@link Vec2}
   */
  dot(vector: Vec2 = new Vec2()): number {
    return this.x * vector.x + this.y * vector.y
  }

  /**
   * Calculate the linear interpolation of this [vector]{@link Vec2} by given [vector]{@link Vec2} and alpha, where alpha is the percent distance along the line
   * @param vector - [vector]{@link Vec2} to interpolate towards
   * @param alpha=1 - interpolation factor in the [0, 1] interval
   * @returns - this [vector]{@link Vec2} after linear interpolation
   */
  lerp(vector: Vec2 = new Vec2(), alpha = 1): Vec2 {
    this.x += (vector.x - this.x) * alpha
    this.y += (vector.y - this.y) * alpha

    return this
  }
}
