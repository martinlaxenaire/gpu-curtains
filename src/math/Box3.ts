import { Vec3 } from './Vec3'
import { Mat4 } from './Mat4'

// declare our corners once should be enough
const points: Vec3[] = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()]

/**
 * Used to handle bounding boxes in 3D space.
 * Basically made of two min and max {@link Vec3 | vectors} that represents the edges of the 3D bounding box.
 */
export class Box3 {
  /** Min {@link Vec3 | vector} of the {@link Box3} */
  min: Vec3
  /** Max {@link Vec3 | vector} of the {@link Box3} */
  max: Vec3

  /**
   * Box3 constructor
   * @param min - min {@link Vec3 | vector} of the {@link Box3}
   * @param max - max {@link Vec3 | vector} of the {@link Box3}
   */
  constructor(min: Vec3 = new Vec3(Infinity), max: Vec3 = new Vec3(-Infinity)) {
    this.min = min
    this.max = max
  }

  /**
   * Set a {@link Box3} from two min and max {@link Vec3 | vectors}
   * @param min - min {@link Vec3 | vector} of the {@link Box3}
   * @param max - max {@link Vec3 | vector} of the {@link Box3}
   */
  set(min: Vec3 = new Vec3(Infinity), max: Vec3 = new Vec3(-Infinity)): Box3 {
    this.min.copy(min)
    this.max.copy(max)

    return this
  }

  /**
   * Check whether the {@link Box3} min and max values have actually been set
   */
  isEmpty() {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z
  }

  /**
   * Copy a {@link Box3} into this {@link Box3}.
   * @param box - {@link Box3} to copy
   */
  copy(box: Box3): Box3 {
    this.set(box.min.clone(), box.max.clone())
    return this
  }

  /**
   * Clone this {@link Box3}
   * @returns - cloned {@link Box3}
   */
  clone(): Box3 {
    return new Box3().copy(this)
  }

  /**
   * Get the {@link Box3} center
   * @readonly
   * @returns - {@link Vec3 | center vector} of the {@link Box3}
   */
  get center(): Vec3 {
    return this.max.clone().add(this.min).multiplyScalar(0.5)
  }

  /**
   * Get the {@link Box3} size
   * @readonly
   * @returns - {@link Vec3 | size vector} of the {@link Box3}
   */
  get size(): Vec3 {
    return this.max.clone().sub(this.min)
  }

  /**
   * Get the {@link Box3} radius
   * @readonly
   * @returns - radius of the {@link Box3}
   */
  get radius(): number {
    return this.max.distance(this.min) * 0.5
  }

  /**
   * Apply a {@link Mat4 | matrix} to a {@link Box3}
   * Useful to apply a transformation {@link Mat4 | matrix} to a {@link Box3}
   * @param matrix - {@link Mat4 | matrix} to use
   * @param transformedBox - {@link Box3 | transformed Box3} to set
   * @returns - the {@link Box3 | transformed Box3} after {@link Mat4 | matrix} application
   */
  applyMat4(matrix: Mat4 = new Mat4(), transformedBox = new Box3()): Box3 {
    if (this.isEmpty()) return this

    const corners: Vec3[] = []

    // remember we're essentially dealing with plane geometries
    // so if min Z and max Z are equals, it's actually a plane geometry
    // just apply the matrix to its four corners
    if (this.min.z === this.max.z) {
      corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[1] = points[1].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix)
      corners[2] = points[2].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[3] = points[3].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix)
      // also use plane center to avoid false frustum clip computations when plane is entirely in viewport
      corners[4] = points[4].set(0, 0, 0).applyMat4(matrix)
    } else {
      corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[1] = points[1].set(this.min.x, this.min.y, this.max.z).applyMat4(matrix)
      corners[2] = points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix)
      corners[3] = points[3].set(this.min.x, this.max.y, this.max.z).applyMat4(matrix)
      corners[4] = points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[5] = points[5].set(this.max.x, this.min.y, this.max.z).applyMat4(matrix)
      corners[6] = points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix)
      corners[7] = points[7].set(this.max.x, this.max.y, this.max.z).applyMat4(matrix)
    }

    for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
      transformedBox.min.min(corners[i])
      transformedBox.max.max(corners[i])
    }

    return transformedBox
  }
}
