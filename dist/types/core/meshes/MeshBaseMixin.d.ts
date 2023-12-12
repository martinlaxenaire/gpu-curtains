/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { RenderMaterial } from '../materials/RenderMaterial';
import { Texture } from '../textures/Texture';
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture';
import { ExternalTextureParams, TextureParams } from '../../types/Textures';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { Material } from '../materials/Material';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
import { AllowedGeometries, RenderMaterialParams } from '../../types/Materials';
import { MeshTransformedBaseClass } from './MeshTransformedMixin';
export interface MeshBaseRenderParams extends RenderMaterialParams {
    /** Whether we should add this Mesh to our {@link Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
    /** Flag indicating whether to draw this Mesh or not */
    visible?: boolean;
    /** Controls the order in which this Mesh should be rendered by our {@link Scene} */
    renderOrder?: number;
    /** {@link RenderTarget} to render this Mesh to */
    renderTarget?: RenderTarget;
    /** Parameters used by this Mesh to create a [texture]{@link Texture} */
    texturesOptions?: ExternalTextureParams;
}
/**
 * Base parameters used to create a Mesh
 */
export interface MeshBaseParams extends MeshBaseRenderParams {
    /** Geometry to use */
    geometry: AllowedGeometries;
}
/**
 *  Base options used to create this Mesh
 */
export interface MeshBaseOptions {
    /** The label of this Mesh, sent to various GPU objects for debugging purpose */
    label?: MeshBaseParams['label'];
    /** Shaders to use by this Mesh {@link RenderMaterial} */
    shaders?: MeshBaseParams['shaders'];
    /** Parameters used by this Mesh to create a [texture]{@link Texture} */
    texturesOptions?: ExternalTextureParams;
    /** {@link RenderTarget} to render this Mesh to, if any */
    renderTarget?: RenderTarget | null;
    /** Whether we should add this Mesh to our {@link Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
    /** Whether to compile this Mesh {@link RenderMaterial} [render pipeline]{@link RenderPipelineEntry#pipeline} asynchronously or not */
    useAsyncPipeline?: boolean;
}
/**
 * MeshBaseClass - {@link MeshBase} typescript definition
 */
export declare class MeshBaseClass {
    /** The type of the {@link MeshBaseClass} */
    type: string;
    /** The universal unique id of the {@link MeshBaseClass} */
    readonly uuid: string;
    /** Index of this {@link MeshBaseClass}, i.e. creation order */
    readonly index: number;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Options used to create this {@link MeshBaseClass} */
    options: MeshBaseOptions;
    /** {@link RenderMaterial} used by this {@link MeshBaseClass} */
    material: RenderMaterial;
    /** [Geometry]{@link AllowedGeometries} used by this {@link MeshBaseClass} */
    geometry: MeshBaseParams['geometry'];
    /** {@link RenderTarget} to render this {@link MeshBase} to, if any */
    renderTarget: null | RenderTarget;
    /** Controls the order in which this {@link MeshBaseClass} should be rendered by our {@link Scene} */
    renderOrder: number;
    /** Whether this {@link MeshBaseClass} should be treated as transparent. Impacts the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
    transparent: boolean;
    /** Flag indicating whether to draw this {@link MeshBaseClass} or not */
    visible: boolean;
    /** Flag indicating whether this {@link MeshBaseClass} is ready to be drawn */
    _ready: boolean;
    /** Empty object to store any additional data or custom properties into your Mesh. */
    userData: Record<string, unknown>;
    /** function assigned to the [onReady]{@link MeshBaseClass#onReady} callback */
    _onReadyCallback: () => void;
    /** function assigned to the [onBeforeRender]{@link MeshBaseClass#onBeforeRender} callback */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the [onRender]{@link MeshBaseClass#onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the [onAfterRender]{@link MeshBaseClass#onAfterRender} callback */
    _onAfterRenderCallback: () => void;
    /** function assigned to the [onAfterResize]{@link MeshBaseClass#onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * Assign a callback function to _onReadyCallback
     * @param callback - callback to run when {@link MeshBaseClass} is ready
     * @returns - our Mesh
     */
    onReady: (callback: () => void) => MeshBaseClass | MeshTransformedBaseClass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before {@link MeshBaseClass} will be rendered
     * @returns - our Mesh
     */
    onBeforeRender: (callback: () => void) => MeshBaseClass | MeshTransformedBaseClass;
    /**
     * Assign a callback function to _onRenderCallback
     * @param callback - callback to run when {@link MeshBaseClass} is rendered
     * @returns - our Mesh
     */
    onRender: (callback: () => void) => MeshBaseClass | MeshTransformedBaseClass;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after {@link MeshBaseClass} has been rendered
     * @returns - our Mesh
     */
    onAfterRender: (callback: () => void) => MeshBaseClass | MeshTransformedBaseClass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just after {@link MeshBaseClass} has been resized
     * @returns - our Mesh
     */
    onAfterResize: (callback: () => void) => MeshBaseClass | MeshTransformedBaseClass;
    /**
     * {@link MeshBaseClass} constructor
     * @param renderer - our [renderer]{@link Renderer} class object
     * @param element - a DOM HTML Element that can be bound to a Mesh
     * @param parameters - [Mesh base parameters]{@link MeshBaseParams}
     */
    constructor(renderer: Renderer, element: HTMLElement | null, parameters: MeshBaseParams);
    /**
     * Get private #autoRender value
     * @readonly
     */
    get autoRender(): boolean;
    /**
     * Get/set whether a Mesh is ready or not
     * @readonly
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Add a Mesh to the renderer and the {@link Scene}
     */
    addToScene(): void;
    /**
     * Remove a Mesh from the renderer and the {@link Scene}
     */
    removeFromScene(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
     */
    loseContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been restored
     */
    restoreContext(): void;
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders(): void;
    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry(): void;
    /**
     * Create the Mesh Geometry vertex and index buffers if needed
     */
    createGeometryBuffers(): void;
    /**
     * Set our Mesh geometry: create buffers and add attributes to material
     */
    setGeometry(): void;
    /**
     * Set a Mesh transparent property, then set its material
     * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
     */
    setMaterial(meshParameters: RenderMaterialParams): void;
    /**
     * Set Mesh material attributes
     */
    setMaterialGeometryAttributes(): void;
    /**
     * Get our [render material textures array]{@link RenderMaterial#textures}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Get our [render material render textures array]{@link RenderMaterial#renderTextures}
     * @readonly
     */
    get renderTextures(): RenderTexture[];
    /**
     * Create a new {@link Texture}
     * @param options - [Texture options]{@link TextureParams}
     * @returns - newly created Texture
     */
    createTexture(options: TextureParams): Texture;
    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture): any;
    /**
     * Callback run when a new {@link Texture} has been created
     * @param texture - newly created Texture
     */
    onTextureAdded(texture: Texture): void;
    /**
     * Create a new {@link RenderTexture}
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
     * @returns - newly created RenderTexture
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture;
    /**
     * Add a {@link RenderTexture}
     * @param renderTexture - {@link RenderTexture} to add
     */
    addRenderTexture(renderTexture: RenderTexture): any;
    /**
     * Assign or remove a {@link RenderTarget} to this Mesh
     * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param renderTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setRenderTarget(renderTarget: RenderTarget | null): void;
    /**
     * Get the current {@link RenderMaterial} uniforms
     * @readonly
     */
    get uniforms(): Material['uniforms'];
    /**
     * Get the current {@link RenderMaterial} storages
     * @readonly
     */
    get storages(): Material['storages'];
    /**
     * Resize the Mesh's textures
     * @param boundingRect
     */
    resize(boundingRect?: DOMElementBoundingRect): void;
    /**
     * Called before rendering the Mesh
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
     */
    onBeforeRenderPass(): void;
    /**
     * Render our {@link MeshBaseClass} if the {@link RenderMaterial} is ready
     * @param pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder): void;
    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass(): void;
    /**
     * Render our Mesh
     * - Execute [onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass}
     * - Stop here if [renderer]{@link Renderer} is not ready or Mesh is not [visible]{@link MeshBaseClass#visible}
     * - Execute super render call if it exists
     * - [Render]{@link MeshBaseClass#onRenderPass} our {@link RenderMaterial} and geometry
     * - Execute [onAfterRenderPass]{@link MeshBaseClass#onAfterRenderPass}
     * @param pass - current render pass encoder
     */
    render(pass: GPURenderPassEncoder): void;
    /**
     * Remove the Mesh from the {@link Scene} and destroy it
     */
    remove(): void;
    /**
     * Destroy the Mesh
     */
    destroy(): void;
}
export type MixinConstructor<T = {}> = new (...args: any[]) => T;
/**
 * MeshBase Mixin:
 * Used to mix basic Mesh properties and methods defined in {@link MeshBaseClass} with a given Base of type {@link Object3D}, {@link ProjectedObject3D} or an empty class.
 * @exports MeshBaseMixin
 * @param {*} Base - the class to mix onto
 * @returns {module:MeshBaseMixin~MeshBase} - the mixin class.
 */
declare function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase;
export default MeshBaseMixin;
