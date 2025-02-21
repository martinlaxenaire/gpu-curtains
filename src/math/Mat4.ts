import { Vec3 } from './Vec3'
import { Quat } from './Quat'
import { OrthographicCameraBaseOptions } from '../core/cameras/OrthographicCamera'
import { PerspectiveCameraBaseOptions } from '../core/cameras/PerspectiveCamera'

const xAxis = new Vec3()
const yAxis = new Vec3()
const zAxis = new Vec3()

/** Defines the base parameters to create a perspective projection {@link Mat4}. */
export interface PerspectiveProjectionParams extends PerspectiveCameraBaseOptions {
  /** Perspective aspect ratio (width / height). Default to `1`. */
  aspect?: number
}

/**
 * Basic 4x4 matrix class used for matrix calculations.
 *
 * Note that like three.js, the constructor and {@link set} method take arguments in row-major order, while internally they are stored in the {@link elements} array in column-major order.
 *
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js
 * @see http://glmatrix.net/docs/mat4.js.html
 */
export class Mat4 {
  /** The type of the {@link Mat4} */
  type: string
  /** Our matrix array */
  elements: Float32Array

  // prettier-ignore
  /**
   * Mat4 constructor
   * @param elements - initial array to use, default to identity matrix
   */
  constructor(elements: Float32Array = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])) {
    this.type = 'Mat4'
    this.elements = elements
  }

  /***
   * Sets the matrix from 16 numbers
   *
   * @param n11 - number
   * @param n12 - number
   * @param n13 - number
   * @param n14 - number
   * @param n21 - number
   * @param n22 - number
   * @param n23 - number
   * @param n24 - number
   * @param n31 - number
   * @param n32 - number
   * @param n33 - number
   * @param n34 - number
   * @param n41 - number
   * @param n42 - number
   * @param n43 - number
   * @param n44 - number
   *
   * @returns - this {@link Mat4} after being set
   */
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
  ): Mat4 {
    const te = this.elements

    te[0] = n11
    te[1] = n12
    te[2] = n13
    te[3] = n14
    te[4] = n21
    te[5] = n22
    te[6] = n23
    te[7] = n24
    te[8] = n31
    te[9] = n32
    te[10] = n33
    te[11] = n34
    te[12] = n41
    te[13] = n42
    te[14] = n43
    te[15] = n44

    return this
  }

  /**
   * Sets the {@link Mat4} to an identity matrix
   * @returns - this {@link Mat4} after being set
   */
  identity(): Mat4 {
    // prettier-ignore
    this.set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    )

    return this
  }

  /**
   * Sets the {@link Mat4} values from an array
   * @param array - array to use
   * @param offset - optional offset in the array to use
   * @returns - this {@link Mat4} after being set
   */
  // prettier-ignore
  setFromArray(array: Float32Array | number[] = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]), offset = 0): Mat4 {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i] = array[i + offset]
    }

    return this
  }

  /**
   * Copy another {@link Mat4}
   * @param matrix - matrix to copy
   * @returns - this {@link Mat4} after being set
   */
  copy(matrix: Mat4 = new Mat4()): Mat4 {
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
    this.elements[9] = array[9]
    this.elements[10] = array[10]
    this.elements[11] = array[11]
    this.elements[12] = array[12]
    this.elements[13] = array[13]
    this.elements[14] = array[14]
    this.elements[15] = array[15]

    return this
  }

  /**
   * Clone a {@link Mat4}
   * @returns - cloned {@link Mat4}
   */
  clone(): Mat4 {
    return new Mat4().copy(this)
  }

  /**
   * Multiply this {@link Mat4} with another {@link Mat4}.
   * @param matrix - {@link Mat4} to multiply with.
   * @returns - this {@link Mat4} after multiplication.
   */
  multiply(matrix: Mat4 = new Mat4()): Mat4 {
    return this.multiplyMatrices(this, matrix)
  }

  /**
   * Multiply another {@link Mat4} with this {@link Mat4}.
   * @param matrix - {@link Mat4} to multiply with.
   * @returns - this {@link Mat4} after multiplication.
   */
  premultiply(matrix: Mat4 = new Mat4()): Mat4 {
    return this.multiplyMatrices(matrix, this)
  }

  /**
   * Multiply two {@link Mat4}.
   * @param a - first {@link Mat4}.
   * @param b - second {@link Mat4}.
   * @returns - {@link Mat4} resulting from the multiplication.
   */
  multiplyMatrices(a: Mat4 = new Mat4(), b: Mat4 = new Mat4()): Mat4 {
    const ae = a.elements
    const be = b.elements
    const te = this.elements

    const a11 = ae[0],
      a12 = ae[4],
      a13 = ae[8],
      a14 = ae[12]
    const a21 = ae[1],
      a22 = ae[5],
      a23 = ae[9],
      a24 = ae[13]
    const a31 = ae[2],
      a32 = ae[6],
      a33 = ae[10],
      a34 = ae[14]
    const a41 = ae[3],
      a42 = ae[7],
      a43 = ae[11],
      a44 = ae[15]

    const b11 = be[0],
      b12 = be[4],
      b13 = be[8],
      b14 = be[12]
    const b21 = be[1],
      b22 = be[5],
      b23 = be[9],
      b24 = be[13]
    const b31 = be[2],
      b32 = be[6],
      b33 = be[10],
      b34 = be[14]
    const b41 = be[3],
      b42 = be[7],
      b43 = be[11],
      b44 = be[15]

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44

    return this
  }

  /**
   * {@link premultiply} this {@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector)).
   * @param vector - translation {@link Vec3} to use.
   * @returns - this {@link Mat4} after the premultiply translate operation.
   */
  premultiplyTranslate(vector: Vec3 = new Vec3()): Mat4 {
    // premultiply by a translateMatrix, ie translateMatrix = new Mat4().translate(vector)
    // where translateMatrix[0] = 1, translateMatrix[5] = 1, scaleMatrix[10] = 1, translateMatrix[15] = 1 from identity
    // and translateMatrix[12] = vector.x, translateMatrix[13] = vector.y, translateMatrix[14] = vector.z from translation
    // equivalent (but faster) to this.multiply(translateMatrix, this)

    // from identity matrix
    const a11 = 1
    const a22 = 1
    const a33 = 1
    const a44 = 1

    // from translation
    const a14 = vector.x
    const a24 = vector.y
    const a34 = vector.z

    const be = this.elements
    const te = this.elements

    const b11 = be[0],
      b12 = be[4],
      b13 = be[8],
      b14 = be[12]
    const b21 = be[1],
      b22 = be[5],
      b23 = be[9],
      b24 = be[13]
    const b31 = be[2],
      b32 = be[6],
      b33 = be[10],
      b34 = be[14]
    const b41 = be[3],
      b42 = be[7],
      b43 = be[11],
      b44 = be[15]

    te[0] = a11 * b11 + a14 * b41
    te[4] = a11 * b12 + a14 * b42
    te[8] = a11 * b13 + a14 * b43
    te[12] = a11 * b14 + a14 * b44

    te[1] = a22 * b21 + a24 * b41
    te[5] = a22 * b22 + a24 * b42
    te[9] = a22 * b23 + a24 * b43
    te[13] = a22 * b24 + a24 * b44

    te[2] = a33 * b31 + a34 * b41
    te[6] = a33 * b32 + a34 * b42
    te[10] = a33 * b33 + a34 * b43
    te[14] = a33 * b34 + a34 * b44

    te[3] = a44 * b41
    te[7] = a44 * b42
    te[11] = a44 * b43
    te[15] = a44 * b44

    return this
  }

  /**
   * {@link premultiply} this {@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector)).
   * @param vector - scale {@link Vec3 | vector} to use.
   * @returns - this {@link Mat4} after the premultiply scale operation.
   */
  premultiplyScale(vector: Vec3 = new Vec3()): Mat4 {
    // premultiply by a scaleMatrix, ie scaleMatrix = new Mat4().scale(vector)
    // where scaleMatrix[0] = vector.x, scaleMatrix[5] = vector.y, scaleMatrix[10] = vector.z, scaleMatrix[15] = 1
    // equivalent (but faster) to this.multiply(scaleMatrix, this)

    const be = this.elements
    const te = this.elements

    const a11 = vector.x
    const a22 = vector.y
    const a33 = vector.z
    const a44 = 1

    const b11 = be[0],
      b12 = be[4],
      b13 = be[8],
      b14 = be[12]
    const b21 = be[1],
      b22 = be[5],
      b23 = be[9],
      b24 = be[13]
    const b31 = be[2],
      b32 = be[6],
      b33 = be[10],
      b34 = be[14]
    const b41 = be[3],
      b42 = be[7],
      b43 = be[11],
      b44 = be[15]

    te[0] = a11 * b11
    te[4] = a11 * b12
    te[8] = a11 * b13
    te[12] = a11 * b14

    te[1] = a22 * b21
    te[5] = a22 * b22
    te[9] = a22 * b23
    te[13] = a22 * b24

    te[2] = a33 * b31
    te[6] = a33 * b32
    te[10] = a33 * b33
    te[14] = a33 * b34

    te[3] = a44 * b41
    te[7] = a44 * b42
    te[11] = a44 * b43
    te[15] = a44 * b44

    return this
  }

  /**
   * Get the {@link Mat4} inverse
   * @returns - the inverted {@link Mat4}
   */
  invert() {
    // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
    const te = this.elements,
      n11 = te[0],
      n21 = te[1],
      n31 = te[2],
      n41 = te[3],
      n12 = te[4],
      n22 = te[5],
      n32 = te[6],
      n42 = te[7],
      n13 = te[8],
      n23 = te[9],
      n33 = te[10],
      n43 = te[11],
      n14 = te[12],
      n24 = te[13],
      n34 = te[14],
      n44 = te[15],
      t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
      t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
      t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
      t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14

    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

    const detInv = 1 / det

    te[0] = t11 * detInv
    te[1] =
      (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) *
      detInv
    te[2] =
      (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) *
      detInv
    te[3] =
      (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) *
      detInv

    te[4] = t12 * detInv
    te[5] =
      (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) *
      detInv
    te[6] =
      (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) *
      detInv
    te[7] =
      (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) *
      detInv

    te[8] = t13 * detInv
    te[9] =
      (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) *
      detInv
    te[10] =
      (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) *
      detInv
    te[11] =
      (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) *
      detInv

    te[12] = t14 * detInv
    te[13] =
      (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) *
      detInv
    te[14] =
      (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) *
      detInv
    te[15] =
      (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) *
      detInv

    return this
  }

  /**
   * Clone and invert the {@link Mat4}
   * @returns - inverted cloned {@link Mat4}
   */
  getInverse(): Mat4 {
    return this.clone().invert()
  }

  /**
   * Transpose this {@link Mat4}
   * @returns - the transposed {@link Mat4}
   */
  transpose(): Mat4 {
    let t
    const te = this.elements

    t = te[1]
    te[1] = te[4]
    te[4] = t

    t = te[2]
    te[2] = te[8]
    te[8] = t

    t = te[3]
    te[3] = te[12]
    te[12] = t

    t = te[6]
    te[6] = te[9]
    te[9] = t

    t = te[7]
    te[7] = te[13]
    te[13] = t

    t = te[11]
    te[11] = te[14]
    te[14] = t

    return this
  }

  /**
   * Translate a {@link Mat4}.
   * @param vector - translation {@link Vec3} to use.
   * @returns - translated {@link Mat4}.
   */
  translate(vector: Vec3 = new Vec3()): Mat4 {
    const a = this.elements

    a[12] = a[0] * vector.x + a[4] * vector.y + a[8] * vector.z + a[12]
    a[13] = a[1] * vector.x + a[5] * vector.y + a[9] * vector.z + a[13]
    a[14] = a[2] * vector.x + a[6] * vector.y + a[10] * vector.z + a[14]
    a[15] = a[3] * vector.x + a[7] * vector.y + a[11] * vector.z + a[15]

    return this
  }

  /**
   * Get the translation {@link Vec3} component of a {@link Mat4}
   * @param position - {@link Vec3} to set
   * @returns - translation {@link Vec3} component of this {@link Mat4}
   */
  getTranslation(position = new Vec3()): Vec3 {
    return position.set(this.elements[12], this.elements[13], this.elements[14])
  }

  /**
   * Scale a {@link Mat4}
   * @param vector - scale {@link Vec3 | vector} to use
   * @returns - scaled {@link Mat4}
   */
  scale(vector: Vec3 = new Vec3()): Mat4 {
    const a = this.elements

    a[0] *= vector.x
    a[1] *= vector.x
    a[2] *= vector.x
    a[3] *= vector.x
    a[4] *= vector.y
    a[5] *= vector.y
    a[6] *= vector.y
    a[7] *= vector.y
    a[8] *= vector.z
    a[9] *= vector.z
    a[10] *= vector.z
    a[11] *= vector.z

    return this
  }

  /**
   * Rotate a {@link Mat4} from a {@link Quat | quaternion}
   * @param quaternion - {@link Quat | quaternion} to use
   * @returns - rotated {@link Mat4}
   */
  rotateFromQuaternion(quaternion: Quat = new Quat()): Mat4 {
    const te = this.elements

    const x = quaternion.elements[0],
      y = quaternion.elements[1],
      z = quaternion.elements[2],
      w = quaternion.elements[3]

    const x2 = x + x,
      y2 = y + y,
      z2 = z + z
    const xx = x * x2,
      xy = x * y2,
      xz = x * z2
    const yy = y * y2,
      yz = y * z2,
      zz = z * z2
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2

    te[0] = 1 - (yy + zz)
    te[4] = xy - wz
    te[8] = xz + wy

    te[1] = xy + wz
    te[5] = 1 - (xx + zz)
    te[9] = yz - wx

    te[2] = xz - wy
    te[6] = yz + wx
    te[10] = 1 - (xx + yy)

    return this
  }

  /**
   * Get the maximum scale of the {@link Mat4} on all axes
   * @returns - maximum scale of the {@link Mat4}
   */
  getMaxScaleOnAxis(): number {
    const te = this.elements

    const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2]
    const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6]
    const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10]

    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq))
  }

  /**
   * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale
   * Equivalent for applying translation, rotation and scale matrices but much faster
   * Source code from: http://glmatrix.net/docs/mat4.js.html
   *
   * @param translation - translation {@link Vec3 | vector} to use
   * @param quaternion - {@link Quat | quaternion} to use
   * @param scale - translation {@link Vec3 | vector} to use
   * @returns - transformed {@link Mat4}
   */
  compose(translation: Vec3 = new Vec3(), quaternion: Quat = new Quat(), scale: Vec3 = new Vec3(1)): Mat4 {
    const matrix = this.elements

    // Quaternion math
    const x = quaternion.elements[0],
      y = quaternion.elements[1],
      z = quaternion.elements[2],
      w = quaternion.elements[3]

    const x2 = x + x
    const y2 = y + y
    const z2 = z + z
    const xx = x * x2
    const xy = x * y2
    const xz = x * z2
    const yy = y * y2
    const yz = y * z2
    const zz = z * z2
    const wx = w * x2
    const wy = w * y2
    const wz = w * z2
    const sx = scale.x
    const sy = scale.y
    const sz = scale.z

    matrix[0] = (1 - (yy + zz)) * sx
    matrix[1] = (xy + wz) * sx
    matrix[2] = (xz - wy) * sx
    matrix[3] = 0
    matrix[4] = (xy - wz) * sy
    matrix[5] = (1 - (xx + zz)) * sy
    matrix[6] = (yz + wx) * sy
    matrix[7] = 0
    matrix[8] = (xz + wy) * sz
    matrix[9] = (yz - wx) * sz
    matrix[10] = (1 - (xx + yy)) * sz
    matrix[11] = 0
    matrix[12] = translation.x
    matrix[13] = translation.y
    matrix[14] = translation.z
    matrix[15] = 1

    return this
  }

  /**
   * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale, rotating and scaling around the given {@link Vec3 | origin vector}
   * Equivalent for applying translation, rotation and scale matrices but much faster
   * Source code from: http://glmatrix.net/docs/mat4.js.html
   *
   * @param translation - translation {@link Vec3 | vector} to use
   * @param quaternion - {@link Quat | quaternion} to use
   * @param scale - translation {@link Vec3 | vector} to use
   * @param origin - origin {@link Vec3 | vector} around which to scale and rotate
   * @returns - transformed {@link Mat4}
   */
  composeFromOrigin(
    translation: Vec3 = new Vec3(),
    quaternion: Quat = new Quat(),
    scale: Vec3 = new Vec3(1),
    origin: Vec3 = new Vec3()
  ): Mat4 {
    const matrix = this.elements

    // Quaternion math
    const x = quaternion.elements[0],
      y = quaternion.elements[1],
      z = quaternion.elements[2],
      w = quaternion.elements[3]

    const x2 = x + x
    const y2 = y + y
    const z2 = z + z

    const xx = x * x2
    const xy = x * y2
    const xz = x * z2
    const yy = y * y2
    const yz = y * z2
    const zz = z * z2

    const wx = w * x2
    const wy = w * y2
    const wz = w * z2

    const sx = scale.x
    const sy = scale.y
    const sz = scale.z

    const ox = origin.x
    const oy = origin.y
    const oz = origin.z

    const out0 = (1 - (yy + zz)) * sx
    const out1 = (xy + wz) * sx
    const out2 = (xz - wy) * sx
    const out4 = (xy - wz) * sy
    const out5 = (1 - (xx + zz)) * sy
    const out6 = (yz + wx) * sy
    const out8 = (xz + wy) * sz
    const out9 = (yz - wx) * sz
    const out10 = (1 - (xx + yy)) * sz

    matrix[0] = out0
    matrix[1] = out1
    matrix[2] = out2
    matrix[3] = 0
    matrix[4] = out4
    matrix[5] = out5
    matrix[6] = out6
    matrix[7] = 0
    matrix[8] = out8
    matrix[9] = out9
    matrix[10] = out10
    matrix[11] = 0
    matrix[12] = translation.x + ox - (out0 * ox + out4 * oy + out8 * oz)
    matrix[13] = translation.y + oy - (out1 * ox + out5 * oy + out9 * oz)
    matrix[14] = translation.z + oz - (out2 * ox + out6 * oy + out10 * oz)
    matrix[15] = 1

    return this
  }

  /**
   * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}
   * @param eye - {@link Vec3 | position vector} of the object that should be rotated
   * @param target - {@link Vec3 | target vector} to look at
   * @param up - up {@link Vec3 | vector}
   * @returns - rotated {@link Mat4}
   */
  lookAt(eye: Vec3 = new Vec3(), target: Vec3 = new Vec3(), up: Vec3 = new Vec3(0, 1, 0)): Mat4 {
    const te = this.elements

    zAxis.copy(eye).sub(target)

    if (zAxis.lengthSq() === 0) {
      // eye and target are in the same position
      zAxis.z = 1
    }

    zAxis.normalize()
    xAxis.crossVectors(up, zAxis)

    if (xAxis.lengthSq() === 0) {
      // up and z are parallel
      if (Math.abs(up.z) === 1) {
        zAxis.x += 0.0001
      } else {
        zAxis.z += 0.0001
      }

      zAxis.normalize()
      xAxis.crossVectors(up, zAxis)
    }

    xAxis.normalize()
    yAxis.crossVectors(zAxis, xAxis)

    te[0] = xAxis.x
    te[1] = xAxis.y
    te[2] = xAxis.z
    te[3] = 0
    te[4] = yAxis.x
    te[5] = yAxis.y
    te[6] = yAxis.z
    te[7] = 0
    te[8] = zAxis.x
    te[9] = zAxis.y
    te[10] = zAxis.z
    te[11] = 0
    te[12] = eye.x
    te[13] = eye.y
    te[14] = eye.z
    te[15] = 1

    return this
  }

  /**
   * Compute a view {@link Mat4} matrix.
   *
   * This is a view matrix which transforms all other objects
   * to be in the space of the view defined by the parameters.
   *
   * Equivalent to `matrix.lookAt(eye, target, up).invert()` but faster.
   *
   * @param eye - the position of the object.
   * @param target - the position meant to be aimed at.
   * @param up - a vector pointing up.
   * @returns - the view {@link Mat4} matrix.
   */
  makeView(eye: Vec3 = new Vec3(), target: Vec3 = new Vec3(), up: Vec3 = new Vec3(0, 1, 0)): Mat4 {
    const te = this.elements

    zAxis.copy(eye).sub(target).normalize()
    xAxis.crossVectors(up, zAxis).normalize()
    yAxis.crossVectors(zAxis, xAxis).normalize()

    te[0] = xAxis.x
    te[1] = yAxis.x
    te[2] = zAxis.x
    te[3] = 0
    te[4] = xAxis.y
    te[5] = yAxis.y
    te[6] = zAxis.y
    te[7] = 0
    te[8] = xAxis.z
    te[9] = yAxis.z
    te[10] = zAxis.z
    te[11] = 0

    te[12] = -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z)
    te[13] = -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z)
    te[14] = -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z)
    te[15] = 1

    return this
  }

  /**
   * Create an orthographic {@link Mat4} matrix based on the parameters. Transforms from
   *  * the given the left, right, bottom, and top dimensions to -1 +1 in x, and y
   *  * and 0 to +1 in z.
   *
   * @param parameters - {@link OrthographicCameraBaseOptions | parameters} used to create the camera orthographic matrix.
   * @returns - the camera orthographic {@link Mat4} matrix.
   */
  makeOrthographic({
    left = -1,
    right = 1,
    bottom = -1,
    top = 1,
    near = 0.1,
    far = 50,
  }: OrthographicCameraBaseOptions): Mat4 {
    const te = this.elements

    te[0] = 2 / (right - left)
    te[1] = 0
    te[2] = 0
    te[3] = 0

    te[4] = 0
    te[5] = 2 / (top - bottom)
    te[6] = 0
    te[7] = 0

    te[8] = 0
    te[9] = 0
    te[10] = 1 / (near - far)
    te[11] = 0

    te[12] = (right + left) / (left - right)
    te[13] = (top + bottom) / (bottom - top)
    te[14] = near / (near - far)
    te[15] = 1

    return this
  }

  /**
   * Create a perspective {@link Mat4} matrix based on the parameters.
   *
   * Note, The matrix generated sends the viewing frustum to the unit box.
   * We assume a unit box extending from -1 to 1 in the x and y dimensions and
   * from -1 to 1 in the z dimension, as three.js and more generally WebGL handles it.
   *
   * @param parameters - {@link PerspectiveProjectionParams | parameters} used to create the camera perspective matrix.
   * @returns - the camera perspective {@link Mat4} matrix.
   */
  makePerspective({ fov = 90, aspect = 1, near = 0.1, far = 150 }: PerspectiveProjectionParams): Mat4 {
    const top = near * Math.tan((Math.PI / 180) * 0.5 * fov)
    const height = 2 * top
    const width = aspect * height
    const left = -0.5 * width

    const right = left + width
    const bottom = top - height

    const x = (2 * near) / (right - left)
    const y = (2 * near) / (top - bottom)

    const a = (right + left) / (right - left)
    const b = (top + bottom) / (top - bottom)

    // this should handle depth from 0 to 1
    // and correct near / far clipping planes
    // see https://github.com/mrdoob/three.js/blob/master/src/math/Matrix4.js#L777
    const c = -far / (far - near)
    const d = (-far * near) / (far - near)

    // prettier-ignore
    this.set(
      x, 0, 0, 0,
      0, y, 0, 0,
      a, b, c, -1,
      0, 0, d, 0
    )

    return this
  }
}
