import { DOMObject3D } from '../objects3D/DOMObject3D';
import { MeshBaseRenderParams } from '../../core/meshes/mixins/MeshBaseMixin';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { DOMTexture, DOMTextureParams } from '../textures/DOMTexture';
import { AllowedGeometries } from '../../types/Materials';
import { DOMElementBoundingRect, DOMElementParams } from '../../core/DOM/DOMElement';
/**
 * Base parameters to create a {@link DOMMesh}
 */
export interface DOMMeshBaseParams extends MeshBaseRenderParams {
    /** Whether to automatically create a {@link DOMTexture} for all {@link HTMLImageElement}, {@link HTMLVideoElement} and {@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
    autoloadSources?: boolean;
    /** Whether to automatically update the {@link DOMMesh} position on scroll */
    watchScroll?: boolean;
    /** Array of already created {@link DOMTexture} to add to this {@link DOMMesh}. */
    domTextures: DOMTexture[];
}
/**
 * Parameters to create a {@link DOMMesh}
 */
export interface DOMMeshParams extends DOMMeshBaseParams {
    /** {@link core/geometries/Geometry.Geometry | Geometry} to use with the {@link DOMMesh} */
    geometry: AllowedGeometries;
}
declare const DOMMesh_base: import("../../core/meshes/mixins/MeshBaseMixin").MixinConstructor<import("../../core/meshes/mixins/ProjectedMeshBaseMixin").ProjectedMeshBaseClass> & typeof DOMObject3D;
/**
 * Create a {@link core/meshes/Mesh.Mesh | Mesh} based on a {@link DOMObject3D}, which allow the {@link core/meshes/Mesh.Mesh | Mesh} to be scaled and positioned based on a {@link HTMLElement} {@link DOMElementBoundingRect | bounding rectangle}.
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
 * // create a DOMMesh with a box geometry,
 * // assuming there's a HTML element with the "mesh" ID in the DOM
 * // will use the normals colors as default shading
 * const domMesh = new DOMMesh(gpuCurtains, '#mesh', {
 *   label: 'My DOM Mesh',
 *   geometry: new BoxGeometry(),
 * })
 * ```
 */
export declare class DOMMesh extends DOMMesh_base {
    /** {@link GPUCurtainsRenderer} used to create this {@link DOMObject3D} */
    renderer: GPUCurtainsRenderer;
    /** Whether to automatically create a {@link DOMTexture} for all {@link HTMLImageElement}, {@link HTMLVideoElement} and {@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
    autoloadSources: boolean;
    /** Whether all the sources have been successfully loaded */
    _sourcesReady: boolean;
    /** Array of {@link DOMTexture} handled by this {@link DOMMesh}. */
    domTextures: DOMTexture[];
    /** function assigned to the {@link onLoading} callback */
    _onLoadingCallback: (texture: DOMTexture) => void;
    /**
     * DOMMesh constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
     * @param parameters - {@link DOMMeshParams | parameters} used to create this {@link DOMMesh}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters: DOMMeshParams);
    /**
     * Get/set whether our {@link material} and {@link geometry} are ready.
     * @readonly
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded.
     * @readonly
     */
    get sourcesReady(): boolean;
    set sourcesReady(value: boolean);
    /**
     * Add a {@link DOMMesh} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - whether to add this {@link DOMMesh} to the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
     */
    addToScene(addToRenderer?: boolean): void;
    /**
     * Remove a {@link DOMMesh} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link DOMMesh} from the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
     */
    removeFromScene(removeFromRenderer?: boolean): void;
    /**
     * Resize the {@link textures} and {@link domTextures}.
     */
    resizeTextures(): void;
    /**
     * Apply scale and update {@link DOMTexture#modelMatrix | DOMTexture modelMatrix}.
     */
    applyScale(): void;
    /**
     * Create a new {@link DOMTexture}.
     * @param options - {@link DOMTextureParams | DOMTexture parameters}.
     * @returns - newly created {@link DOMTexture}.
     */
    createDOMTexture(options: DOMTextureParams): DOMTexture;
    /**
     * Callback run when a new {@link DOMTexture} has been added.
     * @param domTexture - newly created DOMTexture.
     */
    onDOMTextureAdded(domTexture: DOMTexture): void;
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated {@link DOMTexture}.
     */
    setInitSources(): void;
    /**
     * Reset/change the {@link domElement | DOM Element}.
     * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
     */
    resetDOMElement(element: string | HTMLElement): void;
    /**
     * Get our {@link DOMMesh#domElement | DOM Element} {@link core/DOM/DOMElement.DOMElement#boundingRect | bounding rectangle} accounting for current {@link core/renderers/GPURenderer.GPURenderer#pixelRatio | renderer pixel ratio}.
     */
    get pixelRatioBoundingRect(): DOMElementBoundingRect;
    /**
     * Compute the Mesh geometry if needed.
     */
    computeGeometry(): void;
    /**
     * Called each time one of the initial sources associated {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
     * @param callback - callback to call each time a {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
     * @returns - our {@link DOMMesh}.
     */
    onLoading(callback: (texture: DOMTexture) => void): DOMMesh;
}
export {};
