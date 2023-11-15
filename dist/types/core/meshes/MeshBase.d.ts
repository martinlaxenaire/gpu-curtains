/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { RenderMaterial } from '../materials/RenderMaterial';
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture';
import { Texture } from '../textures/Texture';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderMaterialParams } from '../../types/Materials';
import { TextureDefaultParams } from '../../types/Textures';
import { Material } from '../materials/Material';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
import { MeshBaseOptions, MeshBaseParams } from './MeshBaseMixin';
export declare class MeshBase {
    #private;
    /** The type of the {@link MeshBase} */
    type: string;
    /** The universal unique id of the {@link MeshBase} */
    readonly uuid: string;
    /** Index of this {@link MeshBase}, i.e. creation order */
    readonly index: number;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Options used to create this {@link MeshBase} */
    options: MeshBaseOptions;
    /** {@link RenderMaterial} used by this {@link MeshBase} */
    material: RenderMaterial;
    /** [Geometry]{@link AllowedGeometries} used by this {@link MeshBase} */
    geometry: MeshBaseParams['geometry'];
    /** Array of {@link RenderTexture} handled by this {@link MeshBase} */
    renderTextures: RenderTexture[];
    /** Array of {@link Texture} handled by this {@link MeshBase} */
    textures: Texture[];
    /** {@link RenderTarget} to render this {@link MeshBase} to, if any */
    renderTarget: null | RenderTarget;
    /** Controls the order in which this {@link MeshBase} should be rendered by our {@link Scene} */
    renderOrder: number;
    /** Whether this {@link MeshBase} should be treated as transparent. Impacts the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
    transparent: boolean;
    /** Flag indicating whether to draw this {@link MeshBase} or not */
    visible: boolean;
    /** Flag indicating whether this {@link MeshBase} is ready to be drawn */
    _ready: boolean;
    /** function assigned to the [onReady]{@link MeshBase#onReady} callback */
    _onReadyCallback: () => void;
    /** function assigned to the [onBeforeRender]{@link MeshBase#onBeforeRender} callback */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the [onRender]{@link MeshBase#onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the [onAfterRender]{@link MeshBase#onAfterRender} callback */
    _onAfterRenderCallback: () => void;
    /** function assigned to the [onAfterResize]{@link MeshBase#onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * MeshBase constructor
     * @typedef MeshBaseParams
     * @property {string=} label - MeshBase label
     * @property {boolean=} autoAddToScene - whether we should add this MeshBase to our {@link Scene} to let it handle the rendering process automatically
     * @property {AllowedGeometries} geometry - geometry to draw
     * @property {boolean=} useAsyncPipeline - whether the {@link RenderPipelineEntry} should be compiled asynchronously
     * @property {MaterialShaders} shaders - our MeshBase shader codes and entry points
     * @property {BindGroupInputs=} inputs - our MeshBase {@link BindGroup} inputs
     * @property {BindGroup[]=} bindGroups - already created {@link BindGroup} to use
     * @property {boolean=} transparent - impacts the {@link RenderPipelineEntry} blend properties
     * @property {GPUCullMode=} cullMode - cull mode to use
     * @property {boolean=} visible - whether this Mesh should be visible (drawn) or not
     * @property {number=} renderOrder - controls the order in which this Mesh should be rendered by our {@link Scene}
     * @property {RenderTarget=} renderTarget - {@link RenderTarget} to render onto if any
     * @property {MeshTextureParams=} texturesOptions - textures options to apply
     * @property {Sampler[]=} samplers - array of {@link Sampler}
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(Renderer|GPUCurtains)} 0 - our [renderer]{@link Renderer} class object
     * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
     * @property {MeshBaseParams} 2 - [Mesh base parameters]{@link MeshBaseParams}
  
     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseParams);
    /**
     * Get private #autoAddToScene value
     * @readonly
     */
    get autoAddToScene(): boolean;
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
     * Create a new {@link Texture}
     * @param options - [Texture options]{@link TextureDefaultParams}
     * @returns - newly created Texture
     */
    createTexture(options: TextureDefaultParams): Texture;
    /**
     * Callback run when a new {@link Texture} has been created
     * @param texture - newly created Texture
     */
    onTextureCreated(texture: Texture): void;
    /**
     * Create a new {@link RenderTexture}
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
     * @returns - newly created RenderTexture
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture;
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
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Assign a callback function to _onReadyCallback
     * @param callback - callback to run when {@link MeshBase} is ready
     * @returns - our Mesh
     */
    onReady(callback: () => void): MeshBase;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before {@link MeshBase} will be rendered
     * @returns - our Mesh
     */
    onBeforeRender(callback: () => void): MeshBase;
    /**
     * Assign a callback function to _onRenderCallback
     * @param callback - callback to run when {@link MeshBase} is rendered
     * @returns - our Mesh
     */
    onRender(callback: () => void): MeshBase;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after {@link MeshBase} has been rendered
     * @returns - our Mesh
     */
    onAfterRender(callback: () => void): MeshBase;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just after {@link MeshBase} has been resized
     * @returns - our Mesh
     */
    onAfterResize(callback: () => void): MeshBase;
    /**
     * Called before rendering the Mesh
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
     */
    onBeforeRenderPass(): void;
    /**
     * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
     * @param pass - current render pass encoder
     */
    onRenderPass(pass: GPURenderPassEncoder): void;
    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass(): void;
    /**
     * Render our Mesh
     * - Execute [onBeforeRenderPass]{@link MeshBase#onBeforeRenderPass}
     * - Stop here if [renderer]{@link Renderer} is not ready or Mesh is not [visible]{@link MeshBase#visible}
     * - Execute super render call if it exists
     * - [Render]{@link MeshBase#onRenderPass} our {@link RenderMaterial} and geometry
     * - Execute [onAfterRenderPass]{@link MeshBase#onAfterRenderPass}
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
