import { TypedArray } from '../../core/bindings/utils'
import { GLTF } from '../../types/GLTF'
import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { BufferBindingInput } from '../../core/bindings/BufferBinding'
import { Object3D } from '../../core/objects3D/Object3D'

export interface KeyframesAnimationParams {
  name?: string
  keyframes?: TypedArray
  values?: TypedArray
  path?: GLTF.AnimationChannelTargetPath
  interpolation?: GLTF.AnimationSamplerInterpolation
}

type PathValueMap = {
  translation: Vec3
  rotation: Quat
  scale: Vec3
  weights: BufferBindingInput
}

const tempVec3 = new Vec3()
const tempQuat = new Quat()

export class KeyframesAnimation {
  name: string

  keyframes: TypedArray | null
  values: TypedArray | null

  startTime: number
  currentTime: number
  duration: number

  path: GLTF.AnimationChannelTargetPath | null
  interpolation: GLTF.AnimationSamplerInterpolation

  weightsBindingInputs: BufferBindingInput[]

  onAfterUpdate: () => void | null // used for skins

  #isPlaying: boolean

  constructor({ name = '', keyframes = null, values = null, path = null, interpolation = 'LINEAR' } = {}) {
    this.name = name
    this.keyframes = keyframes
    this.values = values

    this.path = path
    this.interpolation = interpolation

    this.weightsBindingInputs = []
    this.onAfterUpdate = null

    this.#isPlaying = false

    this.reset()

    this.duration = this.keyframes ? this.keyframes[this.keyframes.length - 1] : 0
  }

  addWeightBindingInput(input: BufferBindingInput) {
    this.weightsBindingInputs.push(input)
  }

  reset() {
    this.startTime = 0
    this.currentTime = 0
  }

  play() {
    this.#isPlaying = true
    this.startTime = performance.now()
  }

  pause() {
    this.#isPlaying = false
  }

  stop() {
    this.pause()
    this.reset()
  }

  getCubicSplineComponentValue(
    t: number,
    prevComponentValue: number,
    nextComponentValue: number,
    prevOutputTangentValue: number,
    nextInputTangentValue: number
  ): number {
    const t2 = t * t
    const t3 = t2 * t

    return (
      (2 * t3 - 3 * t2 + 1) * prevComponentValue +
      (t3 - 2 * t2 + t) * prevOutputTangentValue +
      (-2 * t3 + 3 * t2) * nextComponentValue +
      (t3 - t2) * nextInputTangentValue
    )
  }

  getIndexFromInterpolation(index = 0, size = 1): number {
    return this.interpolation === 'CUBICSPLINE' ? index * 3 * size + size : index * size
  }

  update(target: Object3D) {
    if (!this.#isPlaying || !this.keyframes || !this.values || !this.path) return

    this.currentTime = performance.now()

    // TODO timescale
    const time = (this.currentTime - this.startTime) / 1000

    const currentTime = time % this.duration

    const nextTimeIndex = this.keyframes.findIndex((t) => t > currentTime)
    if (nextTimeIndex === -1) return

    const previousTimeIndex = nextTimeIndex - 1
    if (previousTimeIndex === -1) return

    const nextTime = this.keyframes[nextTimeIndex]
    const previousTime = this.keyframes[previousTimeIndex]

    const interpolatedTime = (currentTime - previousTime) / (nextTime - previousTime)
    const deltaTime = nextTime - previousTime

    if (this.path === 'rotation') {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 4)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 4)

      target.quaternion.setFromArray([
        this.values[prevIndex],
        this.values[prevIndex + 1],
        this.values[prevIndex + 2],
        this.values[prevIndex + 3],
      ])

      if (this.interpolation === 'LINEAR' || this.interpolation === 'CUBICSPLINE') {
        tempQuat.setFromArray([
          this.values[nextIndex],
          this.values[nextIndex + 1],
          this.values[nextIndex + 2],
          this.values[nextIndex + 3],
        ])

        if (this.interpolation === 'CUBICSPLINE') {
          // get previous output tangent
          const previousOutputTangent = [
            this.values[prevIndex + 4],
            this.values[prevIndex + 5],
            this.values[prevIndex + 6],
            this.values[prevIndex + 7],
          ]

          const nextInputTangent = [
            this.values[nextIndex - 4],
            this.values[nextIndex - 3],
            this.values[nextIndex - 2],
            this.values[nextIndex - 1],
          ]

          const cubicValue = [
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target.quaternion.elements[0],
              tempQuat.elements[0],
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target.quaternion.elements[1],
              tempQuat.elements[1],
              deltaTime * previousOutputTangent[1],
              deltaTime * nextInputTangent[1]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target.quaternion.elements[2],
              tempQuat.elements[2],
              deltaTime * previousOutputTangent[2],
              deltaTime * nextInputTangent[2]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target.quaternion.elements[3],
              tempQuat.elements[3],
              deltaTime * previousOutputTangent[3],
              deltaTime * nextInputTangent[3]
            ),
          ]

          target.quaternion.setFromArray(cubicValue).normalize()
        } else {
          target.quaternion.slerp(tempQuat, interpolatedTime)
        }
      }

      // update model matrix since we modified the quaternion
      target.shouldUpdateModelMatrix()
    } else if (this.path === 'translation' || this.path === 'scale') {
      const vectorName = this.path === 'translation' ? 'position' : this.path

      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 3)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 3)

      target[vectorName].set(this.values[prevIndex], this.values[prevIndex + 1], this.values[prevIndex + 2])

      if (this.interpolation === 'LINEAR' || this.interpolation === 'CUBICSPLINE') {
        tempVec3.set(this.values[nextIndex], this.values[nextIndex + 1], this.values[nextIndex + 2])

        if (this.interpolation === 'CUBICSPLINE') {
          // get previous output tangent
          const previousOutputTangent = [
            this.values[prevIndex + 3],
            this.values[prevIndex + 4],
            this.values[prevIndex + 5],
          ]

          const nextInputTangent = [this.values[nextIndex - 3], this.values[nextIndex - 2], this.values[nextIndex - 1]]

          const cubicValue = [
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target[vectorName].x,
              tempVec3.x,
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target[vectorName].y,
              tempVec3.y,
              deltaTime * previousOutputTangent[1],
              deltaTime * nextInputTangent[1]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              target[vectorName].z,
              tempVec3.z,
              deltaTime * previousOutputTangent[2],
              deltaTime * nextInputTangent[2]
            ),
          ]

          target[vectorName].set(cubicValue[0], cubicValue[1], cubicValue[2])
        } else {
          target[vectorName].lerp(tempVec3, interpolatedTime)
        }
      }
    } else if (this.path === 'weights') {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, this.weightsBindingInputs.length)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, this.weightsBindingInputs.length)

      for (let i = 0; i < this.weightsBindingInputs.length; i++) {
        const value = this.values[prevIndex + i]
        this.weightsBindingInputs[i].value = value

        if (this.interpolation === 'LINEAR') {
          const nextValue = this.values[nextIndex + i]

          this.weightsBindingInputs[i].value += (nextValue - value) * interpolatedTime
        } else if (this.interpolation === 'CUBICSPLINE') {
          const nextValue = this.values[nextIndex + i]

          // get previous output tangent
          const previousOutputTangent = this.values[prevIndex + i + 1]
          const nextInputTangent = this.values[nextIndex + i - 1]

          this.weightsBindingInputs[i].value = this.getCubicSplineComponentValue(
            interpolatedTime,
            value,
            nextValue,
            deltaTime * previousOutputTangent[0],
            deltaTime * nextInputTangent[0]
          )
        }
      }
    }
  }
}
