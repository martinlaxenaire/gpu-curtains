import { Vec3 } from '../../math/Vec3.mjs';
import { Quat } from '../../math/Quat.mjs';

const tempVec3 = new Vec3();
const tempQuat = new Quat();
class KeyframesAnimation {
  // used for skins
  /**
   * KeyframesAnimation constructor
   * @param parameters - {@link KeyframesAnimationParams | Parameters} used to create this {@link KeyframesAnimation}.
   */
  constructor({
    label = "",
    inputIndex = null,
    keyframes = null,
    values = null,
    path = null,
    interpolation = "LINEAR"
  } = {}) {
    this.label = label;
    this.keyframes = keyframes;
    this.values = values;
    this.path = path;
    this.interpolation = interpolation;
    this.inputIndex = inputIndex;
    this.weightsBindingInputs = [];
    this.onAfterUpdate = null;
    this.duration = this.keyframes ? this.keyframes[this.keyframes.length - 1] : 0;
  }
  /**
   * Add a weight {@link BufferBindingInput} to the {@link weightsBindingInputs} array.
   * @param input - Weight {@link BufferBindingInput}.
   */
  addWeightBindingInput(input) {
    this.weightsBindingInputs.push(input);
  }
  /**
   * Get a cubic spline interpolation value.
   * @param t - Current time value to use in the [0, 1] range.
   * @param prevComponentValue - Previous value to use for interpolation.
   * @param nextComponentValue - Next value to use for interpolation.
   * @param prevOutputTangentValue - Previous output tangent value to use for interpolation.
   * @param nextInputTangentValue - Previous output tangent value to use for interpolation.
   */
  getCubicSplineComponentValue(t, prevComponentValue, nextComponentValue, prevOutputTangentValue, nextInputTangentValue) {
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * prevComponentValue + (t3 - 2 * t2 + t) * prevOutputTangentValue + (-2 * t3 + 3 * t2) * nextComponentValue + (t3 - t2) * nextInputTangentValue;
  }
  /**
   * Get the index from which to return a value from the {@link values} array based on an index in the {@link keyframes} array and the size of the component to animate.
   * @param index - Index in the {@link keyframes} array to use.
   * @param size - Size of the component to animate in the {@link values} array.
   */
  getIndexFromInterpolation(index = 0, size = 1) {
    return this.interpolation === "CUBICSPLINE" ? index * 3 * size + size : index * size;
  }
  /**
   * Update an {@link Object3D} transformation property or eventually the {@link weightsBindingInputs} based on the current time given, the {@link path} and {@link interpolation} used and the {@link keyframes} and {@link values}.
   * @param target - {@link Object3D} to update.
   * @param currentTime - Current time in seconds.
   */
  update(target, currentTime = 0) {
    if (!this.keyframes || !this.values || !this.path) return;
    const nextTimeIndex = this.keyframes.findIndex((t) => t >= currentTime);
    if (nextTimeIndex === -1) return;
    const previousTimeIndex = nextTimeIndex - 1;
    if (previousTimeIndex === -1) return;
    const nextTime = this.keyframes[nextTimeIndex];
    const previousTime = this.keyframes[previousTimeIndex];
    const interpolatedTime = (currentTime - previousTime) / (nextTime - previousTime);
    const deltaTime = nextTime - previousTime;
    if (this.path === "rotation") {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 4);
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 4);
      target.quaternion.setFromArray([
        this.values[prevIndex],
        this.values[prevIndex + 1],
        this.values[prevIndex + 2],
        this.values[prevIndex + 3]
      ]);
      if (this.interpolation === "LINEAR" || this.interpolation === "CUBICSPLINE") {
        tempQuat.setFromArray([
          this.values[nextIndex],
          this.values[nextIndex + 1],
          this.values[nextIndex + 2],
          this.values[nextIndex + 3]
        ]);
        if (this.interpolation === "CUBICSPLINE") {
          const previousOutputTangent = [
            this.values[prevIndex + 4],
            this.values[prevIndex + 5],
            this.values[prevIndex + 6],
            this.values[prevIndex + 7]
          ];
          const nextInputTangent = [
            this.values[nextIndex - 4],
            this.values[nextIndex - 3],
            this.values[nextIndex - 2],
            this.values[nextIndex - 1]
          ];
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
            )
          ];
          target.quaternion.setFromArray(cubicValue).normalize();
        } else {
          target.quaternion.slerp(tempQuat, interpolatedTime);
        }
      }
      target.shouldUpdateModelMatrix();
    } else if (this.path === "translation" || this.path === "scale") {
      const vectorName = this.path === "translation" ? "position" : this.path;
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 3);
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 3);
      target[vectorName].set(this.values[prevIndex], this.values[prevIndex + 1], this.values[prevIndex + 2]);
      if (this.interpolation === "LINEAR" || this.interpolation === "CUBICSPLINE") {
        tempVec3.set(this.values[nextIndex], this.values[nextIndex + 1], this.values[nextIndex + 2]);
        if (this.interpolation === "CUBICSPLINE") {
          const previousOutputTangent = [
            this.values[prevIndex + 3],
            this.values[prevIndex + 4],
            this.values[prevIndex + 5]
          ];
          const nextInputTangent = [this.values[nextIndex - 3], this.values[nextIndex - 2], this.values[nextIndex - 1]];
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
            )
          ];
          target[vectorName].set(cubicValue[0], cubicValue[1], cubicValue[2]);
        } else {
          target[vectorName].lerp(tempVec3, interpolatedTime);
        }
      }
    } else if (this.path === "weights") {
      const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, this.weightsBindingInputs.length);
      const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, this.weightsBindingInputs.length);
      for (let i = 0; i < this.weightsBindingInputs.length; i++) {
        const value = this.values[prevIndex + i];
        this.weightsBindingInputs[i].value = value;
        if (this.interpolation === "LINEAR") {
          const nextValue = this.values[nextIndex + i];
          this.weightsBindingInputs[i].value += (nextValue - value) * interpolatedTime;
        } else if (this.interpolation === "CUBICSPLINE") {
          const nextValue = this.values[nextIndex + i];
          const previousOutputTangent = this.values[prevIndex + i + 1];
          const nextInputTangent = this.values[nextIndex + i - 1];
          this.weightsBindingInputs[i].value = this.getCubicSplineComponentValue(
            interpolatedTime,
            value,
            nextValue,
            deltaTime * previousOutputTangent[0],
            deltaTime * nextInputTangent[0]
          );
        }
      }
    }
  }
}

export { KeyframesAnimation };
