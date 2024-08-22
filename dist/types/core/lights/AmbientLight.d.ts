import { Light, LightBaseParams } from './Light';
import { CameraRenderer } from '../renderers/utils';
/**
 * Create an ambient light that equally illuminates all objects in the scene.
 *
 * This light cannot cast shadows.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 * const ambientLight = new AmbientLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 0.1,
 * })
 * ```
 */
export declare class AmbientLight extends Light {
    /**
     * AmbientLight constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link AmbientLight}.
     * @param parameters - {@link LightBaseParams | parameters} used to create this {@link AmbientLight}.
     */
    constructor(renderer: CameraRenderer, { color, intensity }?: LightBaseParams);
    /** @ignore */
    applyRotation(): void;
    /** @ignore */
    applyPosition(): void;
    /** @ignore */
    applyScale(): void;
    /** @ignore */
    applyTransformOrigin(): void;
}