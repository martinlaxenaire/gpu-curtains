import { Light, LightBaseParams } from './Light';
import { CameraRenderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
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
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link AmbientLight}.
     * @param parameters - {@link LightBaseParams} used to create this {@link AmbientLight}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { label, color, intensity }?: LightBaseParams);
    /** @ignore */
    applyPosition(): void;
}
