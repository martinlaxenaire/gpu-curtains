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
  constructor(x = 0, y = x) {
    this.type = 'Vec2'

    this._x = x
    this._y = y
  }

  /***
   Getters and setters (with onChange callback)
   ***/
  get x() {
    return this._x
  }

  set x(value) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  get y() {
    return this._y
  }

  set y(value) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  onChange(callback) {
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
  set(x = 0, y = 0) {
    this._x = x
    this._y = y

    return this
  }

  /***
   Adds a vector to this vector

   params:
   @vector (Vec2): vector to add

   @returns {Vec2}: this vector after addition
   ***/
  add(vector = new Vec2()) {
    this._x += vector.x
    this._y += vector.y

    return this
  }

  /***
   Adds a scalar to this vector

   params:
   @value (float): number to add

   @returns {Vec2}: this vector after addition
   ***/
  addScalar(value = 0) {
    this._x += value
    this._y += value

    return this
  }

  /***
   Subtracts a vector from this vector

   params:
   @vector (Vec2): vector to use for subtraction

   @returns {Vec2}: this vector after subtraction
   ***/
  sub(vector = new Vec2()) {
    this._x -= vector.x
    this._y -= vector.y

    return this
  }

  /***
   Subtracts a scalar to this vector

   params:
   @value (float): number to use for subtraction

   @returns {Vec2}: this vector after subtraction
   ***/
  subScalar(value = 0) {
    this._x -= value
    this._y -= value

    return this
  }

  /***
   Multiplies a vector with this vector

   params:
   @vector (Vec2): vector to use for multiplication

   @returns {Vec2}: this vector after multiplication
   ***/
  multiply(vector = new Vec2(1)) {
    this._x *= vector.x
    this._y *= vector.y

    return this
  }

  /***
   Multiplies a scalar with this vector

   params:
   @value (float): number to use for multiplication

   @returns {Vec2}: this vector after multiplication
   ***/
  multiplyScalar(value = 1) {
    this._x *= value
    this._y *= value

    return this
  }

  /***
   Copy a vector into this vector

   params:
   @vector (Vec2): vector to copy

   @returns {Vec2}: this vector after copy
   ***/
  copy(vector = new Vec2()) {
    this._x = vector.x
    this._y = vector.y

    return this
  }

  /***
   Clone this vector

   @returns {Vec2}: cloned vector
   ***/
  clone() {
    return new Vec2(this._x, this._y)
  }

  /***
   Apply max values to this vector

   params:
   @vector (Vec2): vector representing max values

   @returns {Vec2}: vector with max values applied
   ***/
  max(vector = new Vec2()) {
    this._x = Math.max(this._x, vector.x)
    this._y = Math.max(this._y, vector.y)

    return this
  }

  /***
   Apply min values to this vector

   params:
   @vector (Vec2): vector representing min values

   @returns {Vec2}: vector with min values applied
   ***/
  min(vector = new Vec2()) {
    this._x = Math.min(this._x, vector.x)
    this._y = Math.min(this._y, vector.y)

    return this
  }

  /***
   Checks if 2 vectors are equal

   params:
   @vector (Vec2): vector to compare

   @returns {boolean}: whether the vectors are equals or not
   ***/
  equals(vector = new Vec2()) {
    return this._x === vector.x && this._y === vector.y
  }

  /***
   Normalize this vector

   @returns {Vec2}: normalized vector
   ***/
  normalize() {
    // normalize
    let len = this._x * this._x + this._y * this._y
    if (len > 0) {
      len = 1 / Math.sqrt(len)
    }
    this._x *= len
    this._y *= len

    return this
  }

  /***
   Calculates the dot product of 2 vectors

   params:
   @vector (Vec2): vector to use for dot product

   @returns {number}: dot product of the 2 vectors
   ***/
  dot(vector = new Vec2()) {
    return this._x * vector.x + this._y * vector.y
  }
}
