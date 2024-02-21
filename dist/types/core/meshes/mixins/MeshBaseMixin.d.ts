/// <reference types="dist" />
import { Renderer } from '../../renderers/utils';
import { RenderMaterial } from '../../materials/RenderMaterial';
import { Texture } from '../../textures/Texture';
import { RenderTexture, RenderTextureParams } from '../../textures/RenderTexture';
import { ExternalTextureParams, TextureParams } from '../../../types/Textures';
import { RenderTarget } from '../../renderPasses/RenderTarget';
import { GPUCurtains } from '../../../curtains/GPUCurtains';
import { Material } from '../../materials/Material';
import { DOMElementBoundingRect } from '../../DOM/DOMElement';
import { AllowedGeometries, RenderMaterialParams } from '../../../types/Materials';
import { ProjectedMeshBaseClass } from './ProjectedMeshBaseMixin';
import { RenderPass } from '../../renderPasses/RenderPass';
export interface MeshBaseRenderParams extends RenderMaterialParams {
    /** Whether we should add this Mesh to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
    /** Flag indicating whether to draw this Mesh or not */
    visible?: boolean;
    /** Controls the order in which this Mesh should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
    renderOrder?: number;
    /** Optional {@link RenderTarget} to render this Mesh to instead of the canvas context. */
    outputTarget?: RenderTarget;
    /** Parameters used by this Mesh to create a {@link Texture} */
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
    /** Parameters used by this Mesh to create a {@link Texture} */
    texturesOptions?: ExternalTextureParams;
    /** {@link RenderTarget} to render this Mesh to instead of the canvas context, if any. */
    outputTarget?: RenderTarget | null;
    /** Whether we should add this Mesh to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
    /** Whether to compile this Mesh {@link RenderMaterial} {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} asynchronously or not */
    useAsyncPipeline?: boolean;
}
/**
 * This class describes the properties and methods to set up a basic Mesh, implemented in the {@link MeshBaseMixin}:
 * - Set and render the {@link Geometry} and {@link RenderMaterial}
 * - Add helpers to create {@link Texture} and {@link RenderTexture}
 * - Handle resizing, device lost/restoration and destroying the resources
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
    /** {@link AllowedGeometries | Geometry} used by this {@link MeshBaseClass} */
    geometry: MeshBaseParams['geometry'];
    /** {@link RenderTarget} to render this Mesh to instead of the canvas context, if any. */
    outputTarget: null | RenderTarget;
    /** Controls the order in which this {@link MeshBaseClass} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
    renderOrder: number;
    /** Whether this {@link MeshBaseClass} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} blend properties */
    transparent: boolean;
    /** Flag indicating whether to draw this {@link MeshBaseClass} or not */
    visible: boolean;
    /** Flag indicating whether this {@link MeshBaseClass} is ready to be drawn */
    _ready: boolean;
    /** Empty object to store any additional data or custom properties into your Mesh. */
    userData: Record<string, unknown>;
    /** function assigned to the {@link onReady} callback */
    _onReadyCallback: () => void;
    /** function assigned to the {@link onBeforeRender} callback */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the {@link onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the {@link onAfterRender} callback */
    _onAfterRenderCallback: () => void;
    /** function assigned to the {@link onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * Assign a callback function to _onReadyCallback
     * @param callback - callback to run when {@link MeshBaseClass} is ready
     * @returns - our Mesh
     */
    onReady: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before {@link MeshBaseClass} will be rendered
     * @returns - our Mesh
     */
    onBeforeRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Assign a callback function to _onRenderCallback
     * @param callback - callback to run when {@link MeshBaseClass} is rendered
     * @returns - our Mesh
     */
    onRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after {@link MeshBaseClass} has been rendered
     * @returns - our Mesh
     */
    onAfterRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just after {@link MeshBaseClass} has been resized
     * @returns - our Mesh
     */
    onAfterResize: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * {@link MeshBaseClass} constructor
     * @param renderer - our {@link Renderer} class object
     * @param element - a DOM HTML Element that can be bound to a Mesh
     * @param parameters - {@link MeshBaseParams | Mesh base parameters}
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
     * Add a Mesh to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene(): void;
    /**
     * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene(): void;
    /**
     * Set a new {@link Renderer} for this Mesh
     * @param renderer - new {@link Renderer} to set
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
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
     * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
     * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
     */
    setRenderingOptionsForRenderPass(renderPass: RenderPass): void;
    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters: MeshBaseRenderParams): MeshBaseRenderParams;
    /**
     * Set a Mesh transparent property, then set its material
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: RenderMaterialParams): void;
    /**
     * Set Mesh material attributes
     */
    setMaterialGeometryAttributes(): void;
    /**
     * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Get our {@link RenderMaterial#renderTextures | RenderMaterial render textures array}
     * @readonly
     */
    get renderTextures(): RenderTexture[];
    /**
     * Create a new {@link Texture}
     * @param options - {@link TextureParams | Texture parameters}
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
     * @param  options - {@link RenderTextureParams | RenderTexture parameters}
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
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setOutputTarget(outputTarget: RenderTarget | null): void;
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
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its struct
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
     * - Execute {@link onBeforeRenderPass}
     * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}
     * - Execute super render call if it exists
     * - {@link onRenderPass | render} our {@link material} and {@link geometry}
     * - Execute {@link onAfterRenderPass}
     * @param pass - current render pass encoder
     */
    render(pass: GPURenderPassEncoder): void;
    /**
     * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
     */
    remove(): void;
    /**
     * Destroy the Mesh
     */
    destroy(): void;
}
/**
 * To get started, we need a type which we'll use to extend
 * other classes from. The main responsibility is to declare
 * that the type being passed in is a class.
 * We use a generic version which can apply a constraint on
 * the class which this mixin is applied to
 * @typeParam T - the base constructor
 */
export type MixinConstructor<T = {}> = new (...args: any[]) => T;
/**
 * Used to mix the basic Mesh properties and methods defined in {@link MeshBaseClass} (basically, set a {@link Geometry} and a {@link RenderMaterial} and render them, add helpers to create {@link Texture} and {@link RenderTexture}) with a given Base of type {@link core/objects3D/Object3D.Object3D | Object3D}, {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}, {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} or an empty class.
 * @exports MeshBaseMixin
 * @param Base - the class to mix onto
 * @returns - the mixed classes, creating a basic Mesh.
 */
declare function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase;
export { MeshBaseMixin };
