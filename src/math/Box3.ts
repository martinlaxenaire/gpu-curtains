import { Vec3 } from './Vec3'
import { Mat4 } from './Mat4'

// declare our corners once should be enough
const points: Vec3[] = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()]

export class Box3 {
  min: Vec3
  max: Vec3

  constructor(min: Vec3 = new Vec3(Infinity), max: Vec3 = new Vec3(-Infinity)) {
    this.min = min
    this.max = max
  }

  set(min: Vec3 = new Vec3(Infinity), max: Vec3 = new Vec3(-Infinity)): Box3 {
    this.min.copy(min)
    this.max.copy(max)

    return this
  }

  clone(): Box3 {
    return new Box3().set(this.min, this.max)
  }

  getCenter(): Vec3 {
    return this.max.clone().add(this.min).multiplyScalar(0.5)
  }

  getSize(): Vec3 {
    return this.max.clone().sub(this.min)
  }

  applyMat4(matrix: Mat4 = new Mat4()): Box3 {
    const corners: Vec3[] = []

    // remember we're essentially dealing with planes
    if (this.min.z === this.max.z) {
      corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[1] = points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix)
      corners[2] = points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix)
      corners[3] = points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix)
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

    const transFormedBox = new Box3()

    for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
      transFormedBox.min.min(corners[i])
      transFormedBox.max.max(corners[i])
    }

    return transFormedBox
  }
}
