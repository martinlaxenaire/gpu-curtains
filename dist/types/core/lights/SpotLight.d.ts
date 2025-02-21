import { Light, LightBaseParams, LightsType } from './Light';
import { CameraRenderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Vec3 } from '../../math/Vec3';
import { SpotShadow } from '../shadows/SpotShadow';
import { ShadowBaseParams } from '../shadows/Shadow';
/**
 * Base parameters used to create a {@link SpotLight}.
 */
export interface SpotLightBaseParams extends LightBaseParams {
    /** The {@link SpotLight} {@link Vec3 | position}. Default to `Vec3(1)`. */
    position?: Vec3;
    /** The {@link SpotLight} {@link Vec3 | target}. Default to `Vec3(0)`. */
    target?: Vec3;
    /** Maximum angle of light dispersion from its direction whose upper bound is `PI / 2`. Default to `PI / 3`. */
    angle?: number;
    /** Percent of the spotlight cone that is attenuated due to penumbra. Takes values between `0` and `1`. Default is `0`. */
    penumbra?: number;
    /** The {@link SpotLight} range, used to compute the {@link SpotLight} attenuation over distance. Default to `0`. */
    range?: number;
    /** The {@link SpotLight} shadow parameters used to create a {@link SpotShadow}. If not set, the {@link SpotShadow} won't be set as active and won't cast any shadows. On the other hand, if anything is passed (even an empty object), the {@link SpotShadow} will start casting shadows, so use with caution. Default to `null` (which means the {@link SpotLight} will not cast shadows). */
    shadow?: ShadowBaseParams;
}
/**
 * Create a spot light, that is emitted from a single point in one direction, along a cone that increases in size the further from the light it gets.
 *
 * This light can cast {@link SpotShadow}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 *
 * // this spot light will not cast any shadows
 * const spotLight = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(5, 2, 3),
 *   penumbra: 0.5,
 * })
 *
 * // this spot light will cast shadows
 * const spotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(-10, 10, -5),
 *   target: new Vec3(0, 0.5, 0),
 *   shadow: {
 *     intensity: 1,
 *   },
 * })
 *
 * // this spot light will ALSO cast shadows!
 * const anotherSpotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 2,
 *   position: new Vec3(12, 0.5, 5),
 *   target: new Vec3(3),
 *   shadow: {}, // that's enough to start casting shadows
 * })
 *
 * // this spot light will cast shadows as well...
 * const lastSpotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(10),
 * })
 *
 * // ... because we're telling it here to start casting shadows
 * lastSpotLightWithShadows.shadow.cast()
 * ```
 */
export declare class SpotLight extends Light {
    #private;
    /** The {@link SpotLight} {@link Vec3 | target}. */
    target: Vec3;
    /** Options used to create this {@link SpotLight}. */
    options: SpotLightBaseParams;
    /** {@link SpotShadow} associated with this {@link SpotLight}. */
    shadow: SpotShadow;
    /**
     * SpotLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotLight}.
     * @param parameters - {@link SpotLightBaseParams} used to create this {@link SpotLight}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { label, color, intensity, position, target, angle, penumbra, range, shadow, }?: SpotLightBaseParams);
    /**
     * Set or reset this {@link SpotLight} {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: CameraRenderer | GPUCurtains): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link SpotLight} has been overflowed or when updating the {@link SpotLight} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link SpotLight} shadow if any. Set to `true` when the {@link renderer} number of {@link SpotLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
     */
    reset(resetShadow?: boolean): void;
    /**
     * Set the {@link SpotLight} position and direction based on the {@link target} and the {@link worldMatrix} translation.
     */
    setPositionDirection(): void;
    /**
     * Get this {@link SpotLight} angle.
     * @returns - The {@link SpotLight} angle.
     */
    get angle(): number;
    /**
     * Set this {@link SpotLight} angle and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} angle in the `[0, PI / 2]` range.
     */
    set angle(value: number);
    /**
     * Get this {@link SpotLight} penumbra.
     * @returns - The {@link SpotLight} penumbra.
     */
    get penumbra(): number;
    /**
     * Set this {@link SpotLight} penumbra and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} penumbra in the `[0, 1]` range.
     */
    set penumbra(value: number);
    /**
     * Get this {@link SpotLight} range.
     * @returns - The {@link SpotLight} range.
     */
    get range(): number;
    /**
     * Set this {@link SpotLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} range.
     */
    set range(value: number);
    /**
     * Rotate this {@link SpotLight} so it looks at the {@link Vec3 | target}.
     * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
     */
    lookAt(target?: Vec3): void;
    /**
     * If the {@link modelMatrix | model matrix} has been updated, set the new position and direction from the {@link worldMatrix} translation.
     */
    updateMatrixStack(): void;
    /**
     * Tell the {@link renderer} that the maximum number of {@link SpotLight} has been overflown.
     * @param lightsType - {@link type} of this light.
     */
    onMaxLightOverflow(lightsType: LightsType): void;
    /**
     * Destroy this {@link SpotLight} and associated {@link SpotShadow}.
     */
    destroy(): void;
}
