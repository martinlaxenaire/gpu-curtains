import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer';
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer';
import { DOMObject3D } from '../objects3D/DOMObject3D';
import { DOMTexture } from '../textures/DOMTexture';
/**
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes}
 *
 * @example
 * ```javascript
 * // first, we need a WebGPU device, that's what GPUDeviceManager is for
 * const gpuDeviceManager = new GPUDeviceManager({
 *   label: 'Custom device manager',
 * })
 *
 * // we need to wait for the WebGPU device to be created
 * await gpuDeviceManager.init()
 *
 * // then we can create a curtains renderer
 * const gpuCurtainsRenderer = new GPUCurtainsRenderer({
 *   deviceManager: gpuDeviceManager, // we need the WebGPU device to create the renderer context
 *   container: document.querySelector('#canvas'),
 * })
 * ```
 */
export declare class GPUCurtainsRenderer extends GPUCameraRenderer {
    /** All created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes} and {@link curtains/meshes/Plane.Plane | planes}. */
    domMeshes: DOMProjectedMesh[];
    /** All created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll. */
    domObjects: DOMObject3D[];
    /** An array containing all our created {@link DOMTexture}. */
    domTextures: DOMTexture[];
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}.
     */
    constructor({ deviceManager, label, container, pixelRatio, autoResize, context, renderPass, camera, lights, }: GPUCameraRendererParams);
    /**
     * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements.
     */
    setRendererObjects(): void;
    /**
     * Add a {@link DOMTexture} to our {@link domTextures | DOM textures array}.
     * @param texture - {@link DOMTexture} to add.
     */
    addDOMTexture(texture: DOMTexture): void;
    /**
     * Remove a {@link DOMTexture} from our {@link domTextures | textures array}.
     * @param texture - {@link DOMTexture} to remove.
     */
    removeDOMTexture(texture: DOMTexture): void;
    /**
     * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/cameras/PerspectiveCamera.PerspectiveCamera#position | position} or {@link core/cameras/PerspectiveCamera.PerspectiveCamera#size | size} changed.
     */
    onCameraMatricesChanged(): void;
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes(): void;
}
