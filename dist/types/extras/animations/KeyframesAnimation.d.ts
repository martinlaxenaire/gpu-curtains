import { TypedArray } from '../../core/bindings/utils';
import { GLTF } from '../../types/gltf/GLTF';
import { BufferBindingInput } from '../../core/bindings/BufferBinding';
import { Object3D } from '../../core/objects3D/Object3D';
/** Parameters used to create a {@link KeyframesAnimation}. */
export interface KeyframesAnimationParams {
    /** Optional label of the {@link KeyframesAnimation}. */
    label?: string;
    /** Optional input accessor index defined in the glTF, used to keep different {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} in sync if they're using the same input. */
    inputIndex?: number;
    /** Keyframes {@link Float32Array} of the {@link KeyframesAnimation}. Could be omitted when used for a skin joint matrices animation. */
    keyframes?: TypedArray;
    /** Values {@link Float32Array} of the {@link KeyframesAnimation} to use for animation, mapped to the {@link keyframes} array. Could be omitted when used for a skin joint matrices animation. */
    values?: TypedArray;
    /** {@link GLTF.AnimationChannelTargetPath | glTF animation path} to use, i.e. what component should be animated between 'translation', 'rotation', 'scale' and 'weights'. Could be omitted when used for a skin joint matrices animation. */
    path?: GLTF.AnimationChannelTargetPath;
    /** {@link GLTF.AnimationSamplerInterpolation | glTF sampler interpolation} to use, i.e. how the animated values should be computed. Default to `LINEAR` . */
    interpolation?: GLTF.AnimationSamplerInterpolation;
}
/**
 * Helper class to use for transformation (position, scale or rotation) and morph targets weights animations (can also be used for skin joint matrices animations using only the `onAfterUpdate` callback).
 *
 * This class is not made to be used alone but should rather be handled by a {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} instance instead.
 */
export declare class KeyframesAnimation {
    /** Optional label of the {@link KeyframesAnimation}. */
    label: string;
    /** Optional input accessor index defined in the glTF, used to keep different {@link extras/animations/TargetsAnimationsManager.TargetsAnimationsManager | TargetsAnimationsManager} in sync if they're using the same input. */
    inputIndex: number | null;
    /** Keyframes {@link Float32Array} of the {@link KeyframesAnimation}. Could be omitted when used for a skin joint matrices animation. */
    keyframes: TypedArray | null;
    /** Values {@link Float32Array} of the {@link KeyframesAnimation} to use for animation, mapped to the {@link keyframes} array. Could be omitted when used for a skin joint matrices animation. */
    values: TypedArray | null;
    /** Total duration of this animation, i.e. the last {@link keyframes} value.  */
    duration: number;
    /** {@link GLTF.AnimationChannelTargetPath | glTF animation path} to use, i.e. what component should be animated between 'translation', 'rotation', 'scale' and 'weights'. Could be omitted when used for a skin joint matrices animation. */
    path: GLTF.AnimationChannelTargetPath | null;
    /** {@link GLTF.AnimationSamplerInterpolation | glTF sampler interpolation} to use, i.e. how the animated values should be computed. Default to `LINEAR` . */
    interpolation: GLTF.AnimationSamplerInterpolation;
    /** Optional {@link BufferBindingInput} array to update a weight binding. */
    weightsBindingInputs: BufferBindingInput[];
    /** Callback to run after the animated value has been updated. Used for skin joints animations to update joint matrices. */
    onAfterUpdate: () => void | null;
    /**
     * KeyframesAnimation constructor
     * @param parameters - {@link KeyframesAnimationParams | Parameters} used to create this {@link KeyframesAnimation}.
     */
    constructor({ label, inputIndex, keyframes, values, path, interpolation, }?: KeyframesAnimationParams);
    /**
     * Add a weight {@link BufferBindingInput} to the {@link weightsBindingInputs} array.
     * @param input - Weight {@link BufferBindingInput}.
     */
    addWeightBindingInput(input: BufferBindingInput): void;
    /**
     * Get a cubic spline interpolation value.
     * @param t - Current time value to use in the [0, 1] range.
     * @param prevComponentValue - Previous value to use for interpolation.
     * @param nextComponentValue - Next value to use for interpolation.
     * @param prevOutputTangentValue - Previous output tangent value to use for interpolation.
     * @param nextInputTangentValue - Previous output tangent value to use for interpolation.
     */
    getCubicSplineComponentValue(t: number, prevComponentValue: number, nextComponentValue: number, prevOutputTangentValue: number, nextInputTangentValue: number): number;
    /**
     * Get the index from which to return a value from the {@link values} array based on an index in the {@link keyframes} array and the size of the component to animate.
     * @param index - Index in the {@link keyframes} array to use.
     * @param size - Size of the component to animate in the {@link values} array.
     */
    getIndexFromInterpolation(index?: number, size?: number): number;
    /**
     * Update an {@link Object3D} transformation property or eventually the {@link weightsBindingInputs} based on the current time given, the {@link path} and {@link interpolation} used and the {@link keyframes} and {@link values}.
     * @param target - {@link Object3D} to update.
     * @param currentTime - Current time in seconds.
     */
    update(target: Object3D, currentTime?: number): void;
}
