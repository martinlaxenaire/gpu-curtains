import { TypedArray } from '../../core/bindings/utils'
import { GLTF } from '../../types/gltf/GLTF'
import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { BufferBindingInput } from '../../core/bindings/BufferBinding'
import { Object3D } from '../../core/objects3D/Object3D'
import { Vec2 } from '../../math/Vec2'

// temp values to use during calcs
const tempVec2 = new Vec2()
const tempVec3 = new Vec3()
const tempQuat = new Quat()

/** Defines the different value types that can be animated. */
export type KeyframesAnimationValueType = 'scalar' | 'vec2' | 'vec3' | 'vec4' | 'quaternion' | 'array'
/** Defines the different input values types. */
export type KeyframesAnimationInputValue = number | Vec2 | Vec3 | Quat | number[] | BufferBindingInput[]

/** Parameters used to create a {@link KeyframesAnimation}. */
export interface KeyframesAnimationParams {
  /** Optional label of the {@link KeyframesAnimation}. */
  label?: string
  /** Optional input accessor index defined in the glTF, used to keep different {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} in sync if they're using the same input. */
  inputIndex?: number
  /** Keyframes {@link Float32Array} of the {@link KeyframesAnimation}. Could be omitted when used for a skin joint matrices animation. */
  keyframes?: TypedArray
  /** Values {@link Float32Array} of the {@link KeyframesAnimation} to use for animation, mapped to the {@link keyframes} array. Could be omitted when used for a skin joint matrices animation. */
  values?: TypedArray
  /** {@link GLTF.AnimationChannelTargetPath | glTF animation path} to use, i.e. what component should be animated between 'translation', 'rotation', 'scale', 'weights' and 'pointer'. Could be omitted when used for a skin joint matrices animation. */
  path?: GLTF.AnimationChannelTargetPath
  /** Type of the value being animated. Could be omitted when used for a skin joint matrices animation. */
  type?: KeyframesAnimationValueType
  /** Input value being animated. Could be omitted when used for a skin joint matrices animation. */
  inputValue?: KeyframesAnimationInputValue

  /** {@link GLTF.AnimationSamplerInterpolation | glTF sampler interpolation} to use, i.e. how the animated values should be computed. Default to `LINEAR` . */
  interpolation?: GLTF.AnimationSamplerInterpolation
}

/**
 * Helper class to use for transformation (position, scale or rotation) and morph targets weights animations (can also be used for skin joint matrices animations using only the `onAfterUpdate` callback).
 *
 * This class is not made to be used alone but should rather be handled by a {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} instance instead.
 */
export class KeyframesAnimation {
  /** Optional label of the {@link KeyframesAnimation}. */
  label: string

  /** Optional input accessor index defined in the glTF, used to keep different {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} in sync if they're using the same input. */
  inputIndex: number | null

  /** Keyframes {@link Float32Array} of the {@link KeyframesAnimation}. Could be omitted when used for a skin joint matrices animation. */
  keyframes: TypedArray | null
  /** Values {@link Float32Array} of the {@link KeyframesAnimation} to use for animation, mapped to the {@link keyframes} array. Could be omitted when used for a skin joint matrices animation. */
  values: TypedArray | null

  /** Total duration of this animation, i.e. the last {@link keyframes} value.  */
  duration: number

  /** {@link GLTF.AnimationChannelTargetPath | glTF animation path} to use, i.e. what component should be animated between 'translation', 'rotation', 'scale' and 'weights'. Could be omitted when used for a skin joint matrices animation. */
  path: GLTF.AnimationChannelTargetPath | null

  /** Type of the value being animated. Could be omitted when used for a skin joint matrices animation. */
  type: KeyframesAnimationValueType | null
  /** Input value being animated. Could be omitted when used for a skin joint matrices animation. */
  inputValue: KeyframesAnimationInputValue | null

  /** {@link GLTF.AnimationSamplerInterpolation | glTF sampler interpolation} to use, i.e. how the animated values should be computed. Default to `LINEAR` . */
  interpolation: GLTF.AnimationSamplerInterpolation

  /** Callback to run after the animated value has been updated. Used for skin joints animations to update joint matrices. */
  onAfterUpdate: () => void | null // used for skins

  /**
   * KeyframesAnimation constructor
   * @param parameters - {@link KeyframesAnimationParams | Parameters} used to create this {@link KeyframesAnimation}.
   */
  constructor(
    {
      label = '',
      inputIndex = null,
      keyframes = null,
      values = null,
      path = null,
      type = null,
      inputValue = null,
      interpolation = 'LINEAR' as GLTF.AnimationSamplerInterpolation,
    } = {} as KeyframesAnimationParams
  ) {
    this.label = label
    this.keyframes = keyframes
    this.values = values

    this.path = path
    this.type = type
    this.inputValue = inputValue
    this.interpolation = interpolation

    this.inputIndex = inputIndex

    this.onAfterUpdate = null

    this.duration = this.keyframes ? this.keyframes[this.keyframes.length - 1] : 0
  }

  /**
   * Add a {@link BufferBindingInput} to the {@link inputValue} array. Use for weights animations.
   * @param input - {@link BufferBindingInput} to add.
   */
  addBindingInput(input: BufferBindingInput) {
    if (!this.inputValue) {
      this.inputValue = []
    }
    ;(this.inputValue as BufferBindingInput[]).push(input)
  }

  /**
   * Get a cubic spline interpolation value.
   * @param t - Current time value to use in the [0, 1] range.
   * @param prevComponentValue - Previous value to use for interpolation.
   * @param nextComponentValue - Next value to use for interpolation.
   * @param prevOutputTangentValue - Previous output tangent value to use for interpolation.
   * @param nextInputTangentValue - Previous output tangent value to use for interpolation.
   */
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

  /**
   * Get the index from which to return a value from the {@link values} array based on an index in the {@link keyframes} array and the size of the component to animate.
   * @param index - Index in the {@link keyframes} array to use.
   * @param size - Size of the component to animate in the {@link values} array.
   */
  getIndexFromInterpolation(index = 0, size = 1): number {
    return this.interpolation === 'CUBICSPLINE' ? index * 3 * size + size : index * size
  }

  /**
   * Update the {@link inputValue} based on the current time given, the {@link path}, {@link type} and {@link interpolation} used and the {@link keyframes} and {@link values}.
   * @param target - {@link Object3D} to update.
   * @param currentTime - Current time in seconds.
   */
  update(target: Object3D, currentTime = 0) {
    // do not run for empty animations
    if (!this.keyframes || !this.values || !this.path || !this.type || this.inputValue === null) return

    const nextTimeIndex = this.keyframes.findIndex((t) => t >= currentTime)
    if (nextTimeIndex === -1) return

    const previousTimeIndex = nextTimeIndex - 1
    if (previousTimeIndex === -1) return

    const nextTime = this.keyframes[nextTimeIndex]
    const previousTime = this.keyframes[previousTimeIndex]

    const interpolatedTime = (currentTime - previousTime) / (nextTime - previousTime)
    const deltaTime = nextTime - previousTime

    if (this.type === 'scalar') {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 1)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 1)

      const value = this.values[prevIndex]
      this.inputValue = value

      if (this.interpolation === 'LINEAR') {
        const nextValue = this.values[nextIndex]

        this.inputValue += (nextValue - value) * interpolatedTime
      } else if (this.interpolation === 'CUBICSPLINE') {
        const nextValue = this.values[nextIndex]

        // get previous output tangent
        const previousOutputTangent = this.values[prevIndex + 1]
        const nextInputTangent = this.values[nextIndex - 1]

        this.inputValue = this.getCubicSplineComponentValue(
          interpolatedTime,
          value,
          nextValue,
          deltaTime * previousOutputTangent[0],
          deltaTime * nextInputTangent[0]
        )
      }
    } else if (this.inputValue instanceof Quat) {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 4)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 4)

      this.inputValue.setFromArray([
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
              this.inputValue.elements[0],
              tempQuat.elements[0],
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.elements[1],
              tempQuat.elements[1],
              deltaTime * previousOutputTangent[1],
              deltaTime * nextInputTangent[1]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.elements[2],
              tempQuat.elements[2],
              deltaTime * previousOutputTangent[2],
              deltaTime * nextInputTangent[2]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.elements[3],
              tempQuat.elements[3],
              deltaTime * previousOutputTangent[3],
              deltaTime * nextInputTangent[3]
            ),
          ]

          this.inputValue.setFromArray(cubicValue).normalize()
        } else {
          this.inputValue.slerp(tempQuat, interpolatedTime)
        }
      }

      if (this.path === 'rotation') {
        // update model matrix since we modified the quaternion
        target.shouldUpdateModelMatrix()
      }
    } else if (this.inputValue instanceof Vec2) {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 2)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 2)

      this.inputValue.set(this.values[prevIndex], this.values[prevIndex + 1])

      if (this.interpolation === 'LINEAR' || this.interpolation === 'CUBICSPLINE') {
        tempVec2.set(this.values[nextIndex], this.values[nextIndex + 1])

        if (this.interpolation === 'CUBICSPLINE') {
          // get previous output tangent
          const previousOutputTangent = [this.values[prevIndex + 2], this.values[prevIndex + 3]]

          const nextInputTangent = [this.values[nextIndex - 2], this.values[nextIndex - 1]]

          const cubicValue = [
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.x,
              tempVec2.x,
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.y,
              tempVec2.y,
              deltaTime * previousOutputTangent[1],
              deltaTime * nextInputTangent[1]
            ),
          ]

          this.inputValue.set(cubicValue[0], cubicValue[1])
        } else {
          this.inputValue.lerp(tempVec2, interpolatedTime)
        }
      }
    } else if (this.inputValue instanceof Vec3) {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 3)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 3)

      this.inputValue.set(this.values[prevIndex], this.values[prevIndex + 1], this.values[prevIndex + 2])

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
              this.inputValue.x,
              tempVec3.x,
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.y,
              tempVec3.y,
              deltaTime * previousOutputTangent[1],
              deltaTime * nextInputTangent[1]
            ),
            this.getCubicSplineComponentValue(
              interpolatedTime,
              this.inputValue.z,
              tempVec3.z,
              deltaTime * previousOutputTangent[2],
              deltaTime * nextInputTangent[2]
            ),
          ]

          this.inputValue.set(cubicValue[0], cubicValue[1], cubicValue[2])
        } else {
          this.inputValue.lerp(tempVec3, interpolatedTime)
        }
      }
    } else if (this.path === 'weights' && (this.inputValue as BufferBindingInput[]).length) {
      const inputLength = (this.inputValue as BufferBindingInput[]).length
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, inputLength)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, inputLength)

      for (let i = 0; i < inputLength; i++) {
        const value = this.values[prevIndex + i]
        this.inputValue[i].value = value

        if (this.interpolation === 'LINEAR') {
          const nextValue = this.values[nextIndex + i]

          ;(this.inputValue[i].value as number) += (nextValue - value) * interpolatedTime
        } else if (this.interpolation === 'CUBICSPLINE') {
          const nextValue = this.values[nextIndex + i]

          // get previous output tangent
          const previousOutputTangent = this.values[prevIndex + i + 1]
          const nextInputTangent = this.values[nextIndex + i - 1]

          this.inputValue[i].value = this.getCubicSplineComponentValue(
            interpolatedTime,
            value,
            nextValue,
            deltaTime * previousOutputTangent[0],
            deltaTime * nextInputTangent[0]
          )
        }
      }
    } else if ((this.inputValue as number[]).length) {
      const inputLength = (this.inputValue as number[]).length
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, inputLength)
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, inputLength)

      for (let i = 0; i < inputLength; i++) {
        const value = this.values[prevIndex + i]
        this.inputValue[i] = value

        if (this.interpolation === 'LINEAR') {
          const nextValue = this.values[nextIndex + i]

          ;(this.inputValue[i] as number) += (nextValue - value) * interpolatedTime
        } else if (this.interpolation === 'CUBICSPLINE') {
          const nextValue = this.values[nextIndex + i]

          // get previous output tangent
          const previousOutputTangent = this.values[prevIndex + i + 1]
          const nextInputTangent = this.values[nextIndex + i - 1]

          this.inputValue[i] = this.getCubicSplineComponentValue(
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
