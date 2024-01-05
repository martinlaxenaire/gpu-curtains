import { PlaneGeometry, PlaneGeometryParams } from '../../core/geometries/PlaneGeometry';
import { DOMMesh, DOMMeshBaseParams } from './DOMMesh';
import { Vec2 } from '../../math/Vec2';
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
 * Plane class:
 * Used to create a special [DOM Mesh]{@link DOMMesh} class object with a specific [plane geometry]{@link PlaneGeometry}.
 * This means a quad that looks like an ordinary [HTML Element]{@link HTMLElement} but with WebGPU rendering capabilities.
 * @extends DOMMesh
 */
export declare class Plane extends DOMMesh {
    /**
     * Plane constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
     * @param parameters - [parameters]{@link PlaneParams} used to create this {@link Plane}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters?: PlaneParams);
    /**
     * Take the pointer [vector]{@link Vec2} position relative to the document and returns it relative to our {@link Plane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer [vector]{@link Vec2} coordinates
     * @returns - raycasted [vector]{@link Vec2} coordinates relative to the {@link Plane}
     */
    mouseToPlaneCoords(mouseCoords?: Vec2): Vec2;
}
