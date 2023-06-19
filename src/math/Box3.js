import { Vec3 } from './Vec3'
import { Mat4 } from './Mat4'

// declare our corners once should be enough
const points = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()]

export class Box3 {
  constructor(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
    this.min = min
    this.max = max
  }

  set(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
    this.min.copy(min)
    this.max.copy(max)

    return this
  }

  clone() {
    return new Box3().set(this.min, this.max)
  }

  getCenter() {
    return this.max.clone().add(this.min).multiplyScalar(0.5)
  }

  getSize() {
    return this.max.clone().sub(this.min)
  }

  applyMat4(matrix = new Mat4()) {
    const corners = [
      points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix),
      points[1].set(this.min.x, this.min.y, this.max.z).applyMat4(matrix),
      points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix),
      points[3].set(this.min.x, this.max.y, this.max.z).applyMat4(matrix),
      points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix),
      points[5].set(this.max.x, this.min.y, this.max.z).applyMat4(matrix),
      points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix),
      points[7].set(this.max.x, this.max.y, this.max.z).applyMat4(matrix),
    ]

    const transFormedBox = new Box3()

    for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
      transFormedBox.min.min(corners[i])
      transFormedBox.max.max(corners[i])
    }

    return transFormedBox
  }
}
