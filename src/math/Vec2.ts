/***
 Here we create a Vec2 class object
 This is a really basic Vector2 class used for vector calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector2.js and http://glmatrix.net/docs/vec2.js.html

 params :
 @x (float): X component of our vector
 @y (float): Y component of our vector

 @returns {Vec2}: our Vec2 class object
 ***/

// TODO lot of (unused at the time) methods are missing

export class Vec2 {
  type: string
  private _x: number
  private _y: number
  _onChangeCallback?(): void

  constructor(x = 0, y = x) {
    this.type = 'Vec2'

    this._x = x
    this._y = y
  }

  /***
   Getters and setters (with onChange callback)
   ***/
  get x(): number {
    return this._x
  }

  set x(value: number) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  get y(): number {
    return this._y
  }

  set y(value: number) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  onChange(callback: () => void): Vec2 {
    if (callback) {
      this._onChangeCallback = callback
    }

    return this
  }

  /***
   Sets the vector from values

   params:
   @x (float): X component of our vector
   @y (float): Y component of our vector

   @returns {Vec2}: this vector after being set
   ***/
  set(x = 0, y = x): Vec2 {
    this.x = x
    this.y = y

    return this
  }

  /***
   Adds a vector to this vector

   params:
   @vector (Vec2): vector to add

   @returns {Vec2}: this vector after addition
   ***/
  add(vector: Vec2 = new Vec2()): Vec2 {
    this.x += vector.x
    this.y += vector.y

    return this
  }

  /***
   Adds a scalar to this vector

   params:
   @value (float): number to add

   @returns {Vec2}: this vector after addition
   ***/
  addScalar(value = 0): Vec2 {
    this.x += value
    this.y += value

    return this
  }

  /***
   Subtracts a vector from this vector

   params:
   @vector (Vec2): vector to use for subtraction

   @returns {Vec2}: this vector after subtraction
   ***/
  sub(vector: Vec2 = new Vec2()): Vec2 {
    this.x -= vector.x
    this.y -= vector.y

    return this
  }

  /***
   Subtracts a scalar to this vector

   params:
   @value (float): number to use for subtraction

   @returns {Vec2}: this vector after subtraction
   ***/
  subScalar(value = 0): Vec2 {
    this.x -= value
    this.y -= value

    return this
  }

  /***
   Multiplies a vector with this vector

   params:
   @vector (Vec2): vector to use for multiplication

   @returns {Vec2}: this vector after multiplication
   ***/
  multiply(vector: Vec2 = new Vec2(1)): Vec2 {
    this.x *= vector.x
    this.y *= vector.y

    return this
  }

  /***
   Multiplies a scalar with this vector

   params:
   @value (float): number to use for multiplication

   @returns {Vec2}: this vector after multiplication
   ***/
  multiplyScalar(value = 1): Vec2 {
    this.x *= value
    this.y *= value

    return this
  }

  /***
   Copy a vector into this vector

   params:
   @vector (Vec2): vector to copy

   @returns {Vec2}: this vector after copy
   ***/
  copy(vector: Vec2 = new Vec2()): Vec2 {
    this.x = vector.x
    this.y = vector.y

    return this
  }

  /***
   Clone this vector

   @returns {Vec2}: cloned vector
   ***/
  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  /***
   Apply max values to this vector

   params:
   @vector (Vec2): vector representing max values

   @returns {Vec2}: vector with max values applied
   ***/
  max(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.max(this.x, vector.x)
    this.y = Math.max(this.y, vector.y)

    return this
  }

  /***
   Apply min values to this vector

   params:
   @vector (Vec2): vector representing min values

   @returns {Vec2}: vector with min values applied
   ***/
  min(vector: Vec2 = new Vec2()): Vec2 {
    this.x = Math.min(this.x, vector.x)
    this.y = Math.min(this.y, vector.y)

    return this
  }

  /***
   Checks if 2 vectors are equal

   params:
   @vector (Vec2): vector to compare

   @returns {boolean}: whether the vectors are equals or not
   ***/
  equals(vector: Vec2 = new Vec2()): boolean {
    return this.x === vector.x && this.y === vector.y
  }

  /***
   Normalize this vector

   @returns {Vec2}: normalized vector
   ***/
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

  /***
   Calculates the dot product of 2 vectors

   params:
   @vector (Vec2): vector to use for dot product

   @returns {number}: dot product of the 2 vectors
   ***/
  dot(vector: Vec2 = new Vec2()): number {
    return this.x * vector.x + this.y * vector.y
  }

  lerp(vector: Vec2 = new Vec2(), alpha = 1): Vec2 {
    this.x += (vector.x - this.x) * alpha
    this.y += (vector.y - this.y) * alpha

    return this
  }
}
