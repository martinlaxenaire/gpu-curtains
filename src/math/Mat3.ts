import { Mat4 } from './Mat4'
import { Vec2 } from './Vec2'

/**
 * Basic 3x3 matrix class used for matrix calculations.
 *
 * Note that like three.js, the constructor and {@link set} method take arguments in row-major order, while internally they are stored in the {@link elements} array in column-major order.
 *
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix3.js
 * @see http://glmatrix.net/docs/mat3.js.html
 */
export class Mat3 {
  /** The type of the {@link Mat3} */
  type: string
  /** Our matrix array */
  elements: Float32Array

  // prettier-ignore
  /**
   * Mat3 constructor
   * @param elements - initial array to use, default to identity matrix
   */
  constructor(elements: Float32Array = new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ])) {
    this.type = 'Mat3'
    this.elements = elements
  }

  /**
   * Sets the matrix from 9 numbers
   *
   * @param n11 - number
   * @param n12 - number
   * @param n13 - number
   * @param n21 - number
   * @param n22 - number
   * @param n23 - number
   * @param n31 - number
   * @param n32 - number
   * @param n33 - number
   * @returns - this {@link Mat3} after being set
   */
  set(
    n11: number,
    n12: number,
    n13: number,
    n21: number,
    n22: number,
    n23: number,
    n31: number,
    n32: number,
    n33: number
  ): Mat3 {
    const te = this.elements

    te[0] = n11
    te[1] = n21
    te[2] = n31
    te[3] = n12
    te[4] = n22
    te[5] = n32
    te[6] = n13
    te[7] = n23
    te[8] = n33

    return this
  }

  /**
   * Sets the {@link Mat3} to an identity matrix
   * @returns - this {@link Mat3} after being set
   */
  identity(): Mat3 {
    this.set(1, 0, 0, 0, 1, 0, 0, 0, 1)

    return this
  }

  /**
   * Sets the {@link Mat3} values from an array
   * @param array - array to use
   * @param offset - optional offset in the array to use
   * @returns - this {@link Mat3} after being set
   */
  // prettier-ignore
  setFromArray(array: Float32Array | number[] = new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]), offset = 0): Mat3 {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i] = array[i + offset]
    }

    return this
  }

  /**
   * Copy another {@link Mat3}
   * @param matrix - matrix to copy
   * @returns - this {@link Mat3} after being set
   */
  copy(matrix: Mat3 = new Mat3()): Mat3 {
    const array = matrix.elements
    this.elements[0] = array[0]
    this.elements[1] = array[1]
    this.elements[2] = array[2]
    this.elements[3] = array[3]
    this.elements[4] = array[4]
    this.elements[5] = array[5]
    this.elements[6] = array[6]
    this.elements[7] = array[7]
    this.elements[8] = array[8]

    return this
  }

  /**
   * Clone a {@link Mat3}
   * @returns - cloned {@link Mat3}
   */
  clone(): Mat3 {
    return new Mat3().copy(this)
  }

  /**
   * Set a {@link Mat3} from a {@link Mat4}.
   * @param matrix - {@link Mat4} to use.
   * @returns - this {@link Mat3} after being set.
   */
  setFromMat4(matrix: Mat4 = new Mat4()) {
    const me = matrix.elements

    this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10])

    return this
  }

  /**
   * Multiply this {@link Mat3} with another {@link Mat3}
   * @param matrix - {@link Mat3} to multiply with
   * @returns - this {@link Mat3} after multiplication
   */
  multiply(matrix: Mat3 = new Mat3()): Mat3 {
    return this.multiplyMatrices(this, matrix)
  }

  /**
   * Multiply another {@link Mat3} with this {@link Mat3}
   * @param matrix - {@link Mat3} to multiply with
   * @returns - this {@link Mat3} after multiplication
   */
  premultiply(matrix: Mat3 = new Mat3()): Mat3 {
    return this.multiplyMatrices(matrix, this)
  }

  /**
   * Multiply two {@link Mat3}
   * @param a - first {@link Mat3}
   * @param b - second {@link Mat3}
   * @returns - {@link Mat3} resulting from the multiplication
   */
  multiplyMatrices(a: Mat3 = new Mat3(), b: Mat3 = new Mat3()): Mat3 {
    const ae = a.elements
    const be = b.elements
    const te = this.elements

    const a11 = ae[0],
      a12 = ae[3],
      a13 = ae[6]
    const a21 = ae[1],
      a22 = ae[4],
      a23 = ae[7]
    const a31 = ae[2],
      a32 = ae[5],
      a33 = ae[8]

    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]

    te[0] = a11 * b11 + a12 * b21 + a13 * b31
    te[3] = a11 * b12 + a12 * b22 + a13 * b32
    te[6] = a11 * b13 + a12 * b23 + a13 * b33

    te[1] = a21 * b11 + a22 * b21 + a23 * b31
    te[4] = a21 * b12 + a22 * b22 + a23 * b32
    te[7] = a21 * b13 + a22 * b23 + a23 * b33

    te[2] = a31 * b11 + a32 * b21 + a33 * b31
    te[5] = a31 * b12 + a32 * b22 + a33 * b32
    te[8] = a31 * b13 + a32 * b23 + a33 * b33

    return this
  }

  /**
   * Invert this {@link Mat3}.
   * @returns - this {@link Mat3} after being inverted
   */
  invert(): Mat3 {
    const te = this.elements,
      n11 = te[0],
      n21 = te[1],
      n31 = te[2],
      n12 = te[3],
      n22 = te[4],
      n32 = te[5],
      n13 = te[6],
      n23 = te[7],
      n33 = te[8],
      t11 = n33 * n22 - n32 * n23,
      t12 = n32 * n13 - n33 * n12,
      t13 = n23 * n12 - n22 * n13,
      det = n11 * t11 + n21 * t12 + n31 * t13

    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0)

    const detInv = 1 / det

    te[0] = t11 * detInv
    te[1] = (n31 * n23 - n33 * n21) * detInv
    te[2] = (n32 * n21 - n31 * n22) * detInv

    te[3] = t12 * detInv
    te[4] = (n33 * n11 - n31 * n13) * detInv
    te[5] = (n31 * n12 - n32 * n11) * detInv

    te[6] = t13 * detInv
    te[7] = (n21 * n13 - n23 * n11) * detInv
    te[8] = (n22 * n11 - n21 * n12) * detInv

    return this
  }

  /**
   * Transpose this {@link Mat3}.
   * @returns - this {@link Mat3} after being transposed
   */
  transpose(): Mat3 {
    let tmp
    const m = this.elements

    tmp = m[1]
    m[1] = m[3]
    m[3] = tmp
    tmp = m[2]
    m[2] = m[6]
    m[6] = tmp
    tmp = m[5]
    m[5] = m[7]
    m[7] = tmp

    return this
  }

  /**
   * Compute a normal {@link Mat3} matrix from a {@link Mat4} transformation matrix.
   * @param matrix - {@link Mat4} transformation matrix
   * @returns - this {@link Mat3} after being inverted and transposed
   */
  getNormalMatrix(matrix: Mat4 = new Mat4()): Mat3 {
    return this.setFromMat4(matrix).invert().transpose()
  }

  /**
   * Set a transformation matrix from translation, scale and center 2D coordinates and a rotation. Useful to compute UV transformation matrices.
   * @param tx - translation along X axis.
   * @param ty - translation along Y axis.
   * @param sx - Scale along X axis.
   * @param sy - Scale along Y axis.
   * @param rotation - Rotation in radians.
   * @param cx - Center of the transformation along X axis.
   * @param cy - Center of the transformation along Y axis.
   */
  setUVTransform(tx = 0, ty = 0, sx = 1, sy = 1, rotation = 0, cx = 0, cy = 0): Mat3 {
    const c = Math.cos(rotation)
    const s = Math.sin(rotation)

    // prettier-ignore
    this.set(
      sx * c, sx * s, - sx * ( c * cx + s * cy ) + cx + tx,
      - sy * s, sy * c, - sy * ( - s * cx + c * cy ) + cy + ty,
      0, 0, 1
    );

    return this
  }

  /**
   * Rotate this {@link Mat3} by a given angle around X axis, counterclockwise.
   * @param theta - Angle to rotate along X axis.
   * @returns - this {@link Mat3} after rotation.
   */
  rotateByAngleX(theta = 0): Mat3 {
    const c = Math.cos(theta)
    const s = Math.sin(theta)

    this.set(1, 0, 0, 0, c, s, 0, -s, c)

    return this
  }

  /**
   * Rotate this {@link Mat3} by a given angle around Y axis, counterclockwise.
   * @param theta - Angle to rotate along Y axis.
   * @returns - this {@link Mat3} after rotation.
   */
  rotateByAngleY(theta = 0): Mat3 {
    const c = Math.cos(theta)
    const s = Math.sin(theta)

    this.set(c, 0, s, 0, 1, 0, -s, 0, c)

    return this
  }

  /**
   * Rotate this {@link Mat3} by a given angle around Z axis, counterclockwise.
   * @param theta - Angle to rotate along Z axis.
   * @returns - this {@link Mat3} after rotation.
   */
  rotateByAngleZ(theta = 0): Mat3 {
    // counterclockwise

    const c = Math.cos(theta)
    const s = Math.sin(theta)

    this.set(c, -s, 0, s, c, 0, 0, 0, 1)

    return this
  }

  /**
   * {@link premultiply} this {@link Mat3} by a translate matrix (i.e. translateMatrix = new Mat3().translate(vector)).
   * @param vector - translation {@link Vec2} to use.
   * @returns - this {@link Mat3} after the premultiply translate operation.
   */
  premultiplyTranslate(vector: Vec2 = new Vec2()): Mat3 {
    // Premultiply by a translation matrix:
    // translateMatrix = [ 1, 0, tx ]
    //                   [ 0, 1, ty ]
    //                   [ 0, 0,  1 ]

    const a11 = 1,
      a22 = 1,
      a33 = 1
    const a13 = vector.x,
      a23 = vector.y

    const be = this.elements
    const te = this.elements

    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]

    te[0] = a11 * b11 + a13 * b31
    te[3] = a11 * b12 + a13 * b32
    te[6] = a11 * b13 + a13 * b33

    te[1] = a22 * b21 + a23 * b31
    te[4] = a22 * b22 + a23 * b32
    te[7] = a22 * b23 + a23 * b33

    te[2] = a33 * b31
    te[5] = a33 * b32
    te[8] = a33 * b33

    return this
  }

  /**
   * {@link premultiply} this {@link Mat3} by a scale matrix (i.e. translateMatrix = new Mat3().scale(vector)).
   * @param vector - scale {@link Vec2} to use.
   * @returns - this {@link Mat3} after the premultiply scale operation.
   */
  premultiplyScale(vector: Vec2 = new Vec2()): Mat3 {
    // Premultiply by a scale matrix:
    // scaleMatrix = [ sx  0   0 ]
    //               [  0  sy   0 ]
    //               [  0   0   1 ]

    const a11 = vector.x,
      a22 = vector.y,
      a33 = 1

    const be = this.elements
    const te = this.elements

    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]

    te[0] = a11 * b11
    te[3] = a11 * b12
    te[6] = a11 * b13

    te[1] = a22 * b21
    te[4] = a22 * b22
    te[7] = a22 * b23

    te[2] = a33 * b31
    te[5] = a33 * b32
    te[8] = a33 * b33

    return this
  }

  /**
   * Translate a {@link Mat3}.
   * @param vector - translation {@link Vec2} to use.
   * @returns - translated {@link Mat3}.
   */
  translate(vector: Vec2 = new Vec2()): Mat3 {
    // Post-multiply by a translation matrix:
    // translateMatrix = [ 1  0  tx ]
    //                   [ 0  1  ty ]
    //                   [ 0  0   1 ]

    const tx = vector.x,
      ty = vector.y

    const be = this.elements
    const te = this.elements

    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]

    // Update the translation column (third column)
    te[6] = b11 * tx + b12 * ty + b13
    te[7] = b21 * tx + b22 * ty + b23
    te[8] = b31 * tx + b32 * ty + b33 // This remains 1

    return this
  }
}
