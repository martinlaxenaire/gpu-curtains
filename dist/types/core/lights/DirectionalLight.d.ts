import { Light, LightBaseParams, LightsType } from './Light';
import { Vec3 } from '../../math/Vec3';
import { DirectionalShadow, DirectionalShadowParams } from '../shadows/DirectionalShadow';
import { CameraRenderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Base parameters used to create a {@link DirectionalLight}.
 */
export interface DirectionalLightBaseParams extends LightBaseParams {
    /** The {@link DirectionalLight} {@link Vec3 | position}. Default to `Vec3(1)`. */
    position?: Vec3;
    /** The {@link DirectionalLight} {@link Vec3 | target}. Default to `Vec3(0)`. */
    target?: Vec3;
    /** The {@link DirectionalLight} shadow parameters used to create a {@link DirectionalShadow}. If not set, the {@link DirectionalShadow} won't be set as active and won't cast any shadows. On the other hand, if anything is passed (even an empty object), the {@link DirectionalShadow} will start casting shadows, so use with caution. Default to `null` (which means the {@link DirectionalLight} will not cast shadows). */
    shadow?: DirectionalShadowParams;
}
/**
 * Create a directional light, that is emitted in a single direction without any attenuation. A common use case for this type of light is to simulate the sun.
 *
 * This light can cast {@link DirectionalShadow}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 *
 * // this directional light will not cast any shadows
 * const directionalLight = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(5, 2, 3),
 * })
 *
 * // this directional light will cast shadows
 * const directionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(-10, 10, -5),
 *   shadow: {
 *     intensity: 1,
 *   },
 * })
 *
 * // this directional light will ALSO cast shadows!
 * const anotherDirectionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 2,
 *   position: new Vec3(12, 0.5, 5),
 *   target: new Vec3(3),
 *   shadow: {}, // that's enough to start casting shadows
 * })
 *
 * // this directional light will cast shadows as well...
 * const lastDirectionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(10),
 * })
 *
 * // ... because we're telling it here to start casting shadows
 * lastDirectionalLightWithShadows.shadow.cast()
 * ```
 */
export declare class DirectionalLight extends Light {
    #private;
    /** The {@link DirectionalLight} {@link Vec3 | target}. */
    target: Vec3;
    /** Options used to create this {@link DirectionalLight}. */
    options: DirectionalLightBaseParams;
    /** {@link DirectionalShadow} associated with this {@link DirectionalLight}. */
    shadow: DirectionalShadow;
    /**
     * DirectionalLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalLight}.
     * @param parameters - {@link DirectionalLightBaseParams} used to create this {@link DirectionalLight}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { label, color, intensity, position, target, shadow, }?: DirectionalLightBaseParams);
    /**
     * Set or reset this {@link DirectionalLight} {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: CameraRenderer | GPUCurtains): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed or when updating the {@link DirectionalLight} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link DirectionalLight} shadow if any. Set to `true` when the {@link renderer} number of {@link DirectionalLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
     */
    reset(resetShadow?: boolean): void;
    /**
     * Get this {@link DirectionalLight} intensity.
     * @returns - The {@link DirectionalLight} intensity.
     */
    get intensity(): number;
    /**
     * Set this {@link DirectionalLight} intensity and clear shadow if intensity is `0`.
     * @param value - The new {@link DirectionalLight} intensity.
     */
    set intensity(value: number);
    /**
     * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation.
     */
    setDirection(): void;
    /**
     * Rotate this {@link DirectionalLight} so it looks at the {@link Vec3 | target}.
     * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
     */
    lookAt(target?: Vec3): void;
    /**
     * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
     */
    updateMatrixStack(): void;
    /**
     * Tell the {@link renderer} that the maximum number of {@link DirectionalLight} has been overflown.
     * @param lightsType - {@link type} of this light.
     */
    onMaxLightOverflow(lightsType: LightsType): void;
    /**
     * Destroy this {@link DirectionalLight} and associated {@link DirectionalShadow}.
     */
    destroy(): void;
}
