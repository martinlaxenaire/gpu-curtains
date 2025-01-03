import { PlaneGeometry, PlaneGeometryParams } from '../../core/geometries/PlaneGeometry';
import { DOMMesh, DOMMeshBaseParams } from './DOMMesh';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { DOMElementParams } from '../../core/DOM/DOMElement';
/**
 * Parameters used to create a {@link Plane}
 */
export interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {
    /** Optional {@link PlaneGeometry} to use */
    geometry?: PlaneGeometry;
}
/**
 * Used to create a special {@link DOMMesh} class object using a {@link PlaneGeometry}.
 * This means a quad that looks like an ordinary {@link HTMLElement} but with WebGPU rendering capabilities.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a Plane,
 * // assuming there's a HTML element with the "plane" ID in the DOM
 * // will use the normals colors as default shading
 * const plane = new Plane(gpuCurtains, '#plane', {
 *   label: 'My plane',
 * })
 * ```
 */
export declare class Plane extends DOMMesh {
    /**
     * Plane constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
     * @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters?: PlaneParams);
}
