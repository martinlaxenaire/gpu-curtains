import { DOMObject3D } from '../objects3D/DOMObject3D';
import { MeshTransformedBaseClass } from '../../core/meshes/MeshTransformedMixin';
import { MeshBaseRenderParams } from '../../core/meshes/MeshBaseMixin';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { Texture } from '../../core/textures/Texture';
import { AllowedGeometries } from '../../types/Materials';
import { RenderTexture, RenderTextureParams } from '../../core/textures/RenderTexture';
import { DOMElementBoundingRect, DOMElementParams } from '../../core/DOM/DOMElement';
/**
 * Base parameters to create a {@link DOMMesh}
 */
export interface DOMMeshBaseParams extends MeshBaseRenderParams {
    /** Whether to automatically create a {@link Texture} for all [images]{@link HTMLImageElement}, [videos]{@link HTMLVideoElement} and [canvases]{@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
    autoloadSources?: boolean;
    /** Whether to automatically update the {@link DOMMesh} position on scroll */
    watchScroll?: boolean;
}
/**
 * Parameters to create a {@link DOMMesh}
 */
export interface DOMMeshParams extends DOMMeshBaseParams {
    /** {@link Geometry} to use with the {@link DOMMesh} */
    geometry: AllowedGeometries;
}
declare const DOMMesh_base: import("../../core/meshes/MeshBaseMixin").MixinConstructor<MeshTransformedBaseClass> & typeof DOMObject3D;
/**
 * DOMMesh class:
 * Create a {@link Mesh} based on a {@link DOMObject3D}, which allow the {@link Mesh} to be scaled and positioned based on a {@link HTMLElement} [bounding rectangle]{@link DOMElementBoundingRect}
 * TODO!
 * @extends MeshTransformedMixin
 * @mixes {MeshBaseMixin}
 */
export declare class DOMMesh extends DOMMesh_base {
    /** Whether to automatically create a {@link Texture} for all [images]{@link HTMLImageElement}, [videos]{@link HTMLVideoElement} and [canvases]{@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
    autoloadSources: boolean;
    /** Whether all the sources have been successfully loaded */
    _sourcesReady: boolean;
    /** function assigned to the [onLoading]{@link DOMMesh#onLoading} callback */
    _onLoadingCallback: (texture: Texture) => void;
    /**
     * DOMMesh constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
     * @param parameters - [parameters]{@link DOMMeshParams} used to create this {@link DOMMesh}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters: DOMMeshParams);
    /**
     * Get/set whether our [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready
     * @readonly
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded
     * @readonly
     */
    get sourcesReady(): boolean;
    set sourcesReady(value: boolean);
    /**
     * Get whether our {@link DOMMesh} is ready. A {@link DOMMesh} is ready when its [sources are ready]{@link DOMMesh#sourcesReady} and its [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready.
     * @readonly
     */
    get DOMMeshReady(): boolean;
    /**
     * Add a {@link DOMMesh} to the renderer and the {@link Scene}
     */
    addToScene(): void;
    /**
     * Remove a {@link DOMMesh} from the renderer and the {@link Scene}
     */
    removeFromScene(): void;
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated [textures]{@link Texture}
     */
    setInitSources(): void;
    /**
     * Reset/change a [DOMMesh element]{@link DOMMesh#domElement}
     * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    resetDOMElement(element: string | HTMLElement): void;
    /**
     * Get our [DOM Element]{@link DOMMesh#domElement} [bounding rectangle]{@link DOMElement#boundingRect} accounting for current [pixel ratio]{@link GPURenderer#pixelRatio}
     */
    get pixelRatioBoundingRect(): DOMElementBoundingRect;
    /**
     * Create a new {@link RenderTexture}
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture;
    /**
     * Resize the Mesh's render textures only if they're not storage textures
     */
    resizeRenderTextures(): void;
    /**
     * Called each time one of the initial sources associated [texture]{@link Texture} has been uploaded to the GPU
     * @param callback - callback to call each time a [texture]{@link Texture} has been uploaded to the GPU
     * @returns - our {@link DOMMesh}
     */
    onLoading(callback: (texture: Texture) => void): DOMMesh;
}
export {};
