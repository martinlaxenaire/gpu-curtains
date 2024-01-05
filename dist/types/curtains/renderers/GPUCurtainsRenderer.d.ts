import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer';
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer';
/**
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes}
 */
export declare class GPUCurtainsRenderer extends GPUCameraRenderer {
    /** All created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes} and {@link curtains/meshes/Plane.Plane | planes} */
    domMeshes: DOMProjectedMesh[];
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
     */
    constructor({ deviceManager, container, pixelRatio, sampleCount, preferredFormat, alphaMode, camera, }: GPUCameraRendererParams);
    /**
     * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements
     */
    setRendererObjects(): void;
}
