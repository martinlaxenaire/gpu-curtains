import { Vec3 } from './Vec3'
import { Quat } from './Quat'

// TODO lot of (unused at the time) methods are missing

/**
 * Mat4 class:
 * This is a really basic Matrix4 class used for matrix calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js and http://glmatrix.net/docs/mat4.js.html
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
   * @param n11 number
   * @param n12 number
   * @param n13 number
   * @param n14 number
   * @param n21 number
   * @param n22 number
   * @param n23 number
   * @param n24 number
   * @param n31 number
   * @param n32 number
   * @param n33 number
   * @param n34 number
   * @param n41 number
   * @param n42 number
   * @param n43 number
   * @param n44 number
   *
   * @returns - this [matrix]{@link Mat4} after being set
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
   * Sets the [matrix]{@link Mat4} to an identity matrix
   * @returns - this [matrix]{@link Mat4} after being set
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
   * Sets the [matrix]{@link Mat4} values from an array
   * @param array - array to use
   * @returns - this [matrix]{@link Mat4} after being set
   */
  // prettier-ignore
  setFromArray(array: Float32Array | number[] = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])): Mat4 {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i] = array[i]
    }

    return this
  }

  /**
   * Copy another [matrix]{@link Mat4}
   * @param matrix
   * @returns - this [matrix]{@link Mat4} after being set
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
   * Clone a [matrix]{@link Mat4}
   * @returns - cloned [matrix]{@link Mat4}
   */
  clone(): Mat4 {
    return new Mat4().copy(this)
  }

  /**
   * Multiply this [matrix]{@link Mat4} with another [matrix]{@link Mat4}
   * @param matrix - [matrix]{@link Mat4} to multiply with
   * @returns - this [matrix]{@link Mat4} after multiplication
   */
  multiply(matrix: Mat4 = new Mat4()): Mat4 {
    return this.multiplyMatrices(this, matrix)
  }

  /**
   * Multiply another [matrix]{@link Mat4} with this [matrix]{@link Mat4}
   * @param matrix - [matrix]{@link Mat4} to multiply with
   * @returns - this [matrix]{@link Mat4} after multiplication
   */
  premultiply(matrix: Mat4 = new Mat4()): Mat4 {
    return this.multiplyMatrices(matrix, this)
  }

  /**
   * Multiply two [matrices]{@link Mat4}
   * @param a - first [matrix]{@link Mat4}
   * @param b - second [matrix]{@link Mat4}
   * @returns - [matrix]{@link Mat4} resulting from the multiplication
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
   * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector))
   * @param vector - translation [vector]{@link Vec3} to use
   * @returns - this [matrix]{@link Mat4} after the premultiply translate operation
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
   * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector))
   * @param vector - scale [vector]{@link Vec3} to use
   * @returns - this [matrix]{@link Mat4} after the premultiply scale operation
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
   * Get the [matrix]{@link Mat4} inverse
   * @returns - inverted [matrix]{@link Mat4}
   */
  getInverse(): Mat4 {
    const te = this.elements
    const out = new Mat4()
    const oe = out.elements

    const a00 = te[0],
      a01 = te[1],
      a02 = te[2],
      a03 = te[3]

    const a10 = te[4],
      a11 = te[5],
      a12 = te[6],
      a13 = te[7]

    const a20 = te[8],
      a21 = te[9],
      a22 = te[10],
      a23 = te[11]

    const a30 = te[12],
      a31 = te[13],
      a32 = te[14],
      a33 = te[15]

    const b00 = a00 * a11 - a01 * a10
    const b01 = a00 * a12 - a02 * a10
    const b02 = a00 * a13 - a03 * a10
    const b03 = a01 * a12 - a02 * a11
    const b04 = a01 * a13 - a03 * a11
    const b05 = a02 * a13 - a03 * a12
    const b06 = a20 * a31 - a21 * a30
    const b07 = a20 * a32 - a22 * a30
    const b08 = a20 * a33 - a23 * a30
    const b09 = a21 * a32 - a22 * a31
    const b10 = a21 * a33 - a23 * a31
    const b11 = a22 * a33 - a23 * a32

    // Calculate the determinant

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    if (!det) {
      return null
    }
    det = 1 / det

    oe[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
    oe[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
    oe[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
    oe[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
    oe[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
    oe[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
    oe[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
    oe[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
    oe[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
    oe[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
    oe[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
    oe[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
    oe[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
    oe[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
    oe[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
    oe[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det

    return out
  }

  /**
   * Translate a [matrix]{@link Mat4}
   * @param vector - translation [vector]{@link Vec3} to use
   * @returns - translated [matrix]{@link Mat4}
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
   * Scale a [matrix]{@link Mat4}
   * @param vector - scale [vector]{@link Vec3} to use
   * @returns - scaled [matrix]{@link Mat4}
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
   * Rotate a [matrix]{@link Mat4} from a [quaternion]{@link Quat}
   * @param quaternion - [quaternion]{@link Vec3} to use
   * @returns - rotated [matrix]{@link Mat4}
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
   * Set this [matrix]{@link Mat4} as a rotation matrix based on an eye, target and up [vectors]{@link Vec3}
   * @param eye - [position]{@link Vec3} of the object that should be rotated
   * @param target - [target]{@link Vec3} to look at
   * @param up - up [vector]{@link Vec3}
   * @returns - rotated [matrix]{@link Mat4}
   */
  lookAt(eye: Vec3 = new Vec3(), target: Vec3 = new Vec3(), up: Vec3 = new Vec3(0, 1, 0)): Mat4 {
    const te = this.elements

    const _z = eye.clone().sub(target)

    if (_z.lengthSq() === 0) {
      // eye and target are in the same position
      _z.z = 1
    }

    _z.normalize()
    const _x = new Vec3().crossVectors(up, _z)

    if (_x.lengthSq() === 0) {
      // up and z are parallel
      if (Math.abs(up.z) === 1) {
        _z.x += 0.0001
      } else {
        _z.z += 0.0001
      }

      _z.normalize()
      _x.crossVectors(up, _z)
    }

    _x.normalize()
    const _y = new Vec3().crossVectors(_z, _x)

    te[0] = _x.x
    te[4] = _y.x
    te[8] = _z.x
    te[1] = _x.y
    te[5] = _y.y
    te[9] = _z.y
    te[2] = _x.z
    te[6] = _y.z
    te[10] = _z.z

    return this
  }

  /**
   * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale
   * Equivalent for applying translation, rotation and scale matrices but much faster
   * Source code from: http://glmatrix.net/docs/mat4.js.html
   *
   * @param translation - translation [vector]{@link Vec3} to use
   * @param quaternion - [quaternion]{@link Quat} to use
   * @param scale - translation [vector]{@link Vec3} to use
   * @returns - transformed [matrix]{@link Mat4}
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
   * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale, rotating and scaling around the given [origin]{@link Vec3}
   * Equivalent for applying translation, rotation and scale matrices but much faster
   * Source code from: http://glmatrix.net/docs/mat4.js.html
   *
   * @param translation - translation [vector]{@link Vec3} to use
   * @param quaternion - [quaternion]{@link Quat} to use
   * @param scale - translation [vector]{@link Vec3} to use
   * @param origin - origin [vector]{@link Vec3} around which to scale and rotate
   * @returns - transformed [matrix]{@link Mat4}
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
}
