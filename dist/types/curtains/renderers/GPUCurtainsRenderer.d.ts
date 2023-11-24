import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer';
import { DOMMeshType } from '../../core/renderers/GPURenderer';
/**
 * GPUCurtainsRenderer class:
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created [DOM Meshes]{@link DOMMesh}
 * @extends GPUCameraRenderer
 */
export declare class GPUCurtainsRenderer extends GPUCameraRenderer {
    /** All created [DOM Meshes]{@link DOMMesh} and [planes]{@link Plane} */
    domMeshes: DOMMeshType[];
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCurtainsRenderer}
     */
    constructor({ container, pixelRatio, sampleCount, preferredFormat, production, onError, camera, }: GPUCameraRendererParams);
    /**
     * Update the [DOM Meshes]{@link GPUCurtainsRenderer#domMeshes} sizes and positions when the [camera]{@link GPUCurtainsRenderer#camera} [position]{@link Camera#position} changes
     */
    onCameraPositionChanged(): void;
    /**
     * Add the [DOM Meshes]{@link GPUCurtainsRenderer#domMeshes} to our tracked elements
     */
    setRendererObjects(): void;
    /**
     * Set each [DOM Meshes DOM Elements]{GPUCurtainsRenderer#domMeshes.domElement} size on resize
     */
    onResize(): void;
}