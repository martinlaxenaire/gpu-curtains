/// <reference types="@webgpu/types" />
import { Renderer } from '../../renderers/utils';
import type { Material } from '../../materials/Material';
import { RenderMaterial } from '../../materials/RenderMaterial';
import { AllowedGeometries, RenderMaterialParams } from '../../../types/Materials';
import { Geometry } from '../../geometries/Geometry';
import { Texture, TextureParams } from '../../textures/Texture';
import { SceneObjectTextureOptions } from '../../../types/Textures';
import { RenderTarget } from '../../renderPasses/RenderTarget';
import { GPUCurtains } from '../../../curtains/GPUCurtains';
import { DOMElementBoundingRect } from '../../DOM/DOMElement';
import { ProjectedMeshBaseClass } from './ProjectedMeshBaseMixin';
import { RenderPass } from '../../renderPasses/RenderPass';
import { RenderBundle } from '../../renderPasses/RenderBundle';
import { RenderPassEntry } from '../../scenes/Scene';
import { MediaTexture, MediaTextureParams } from '../../textures/MediaTexture';
/**
 * Base render params used to create a Mesh.
 */
export interface MeshBaseRenderParams extends Omit<RenderMaterialParams, 'targets' | 'verticesOrder' | 'topology'> {
    /** Whether we should add this Mesh to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. */
    autoRender?: boolean;
    /** Flag indicating whether to draw this Mesh or not. */
    visible?: boolean;
    /** Controls the order in which this Mesh should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
    renderOrder?: number;
    /** Optional {@link RenderTarget} to render this Mesh to instead of the canvas context. */
    outputTarget?: RenderTarget;
    /** Additional output {@link RenderTarget} onto which render this Mesh, besides the main {@link outputTarget} or screen. Useful for some effects that might need to render the same Mesh twice or more. Beware tho that the Mesh pipeline has to exactly fit the provided {@link RenderTarget} render passes descriptors as no checks will be performed here. */
    additionalOutputTargets?: RenderTarget[];
    /** Whether to render this Mesh into a custom {@link core/scenes/Scene.Scene | Scene} custom screen pass entry instead of the default one. */
    useCustomScenePassEntry?: RenderPassEntry;
    /** Parameters used by this Mesh to create a {@link MediaTexture}. */
    texturesOptions?: SceneObjectTextureOptions;
    /** Optional {@link GPUDevice.createRenderPipeline().targets | targets} properties. */
    targets?: Partial<GPUColorTargetState>[];
    /** Optional {@link RenderBundle} into which this Mesh should be added. */
    renderBundle?: RenderBundle;
}
/**
 * Base parameters used to create a Mesh.
 */
export interface MeshBaseParams extends MeshBaseRenderParams {
    /** Geometry to use */
    geometry?: AllowedGeometries;
}
/**
 *  Base options used to create this Mesh.
 */
export interface MeshBaseOptions extends Omit<MeshBaseRenderParams, 'renderOrder' | 'visible'> {
    /** The label of this Mesh, sent to various GPU objects for debugging purpose. */
    label?: MeshBaseParams['label'];
}
/**
 * This class describes the properties and methods to set up a basic Mesh, implemented in the {@link MeshBaseMixin}:
 * - Set and render the {@link Geometry} and {@link RenderMaterial}
 * - Add helpers to create {@link MediaTexture} and {@link Texture}
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
    /** Additional output {@link RenderTarget} onto which render this Mesh, besides the main {@link outputTarget} or screen. Useful for some effects that might need to render the same Mesh twice or more. Beware tho that the Mesh pipeline has to exactly fit the provided {@link RenderTarget} render passes descriptors as no checks will be performed here. */
    additionalOutputTargets?: RenderTarget[];
    /** {@link RenderBundle} used to render this Mesh, if any. */
    renderBundle: null | RenderBundle;
    /** Controls the order in which this {@link MeshBaseClass} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
    renderOrder: number;
    /** Whether this {@link MeshBaseClass} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} blend properties */
    _transparent: boolean;
    /** Flag indicating whether to draw this {@link MeshBaseClass} or not */
    _visible: boolean;
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
     * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
     * @param callback - callback to run when {@link MeshBaseClass} is ready
     * @returns - our Mesh
     */
    onReady: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
     * @returns - our Mesh
     */
    onBeforeRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just before rendering the {@link MeshBaseClass}.
     * @returns - our Mesh
     */
    onRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - callback to run just after {@link MeshBaseClass} has been rendered
     * @returns - our Mesh
     */
    onAfterRender: (callback: () => void) => MeshBaseClass | ProjectedMeshBaseClass;
    /**
     * Callback to execute just after a Mesh has been resized.
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
    addToScene(addToRenderer?: boolean): void;
    /**
     * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene(removeFromRenderer?: boolean): void;
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
     * Set or update the Mesh {@link Geometry}
     * @param geometry - new {@link Geometry} to use
     */
    useGeometry(geometry: Geometry): void;
    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry(): void;
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
     * Set or update the Mesh {@link RenderMaterial}
     * @param material - new {@link RenderMaterial} to use
     */
    useMaterial(material: RenderMaterial): void;
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
     * Get the transparent property value
     */
    get transparent(): boolean | undefined;
    /**
     * Set the transparent property value. Update the {@link RenderMaterial} rendering options and {@link core/scenes/Scene.Scene | Scene} stack if needed.
     * @param value - new transparency value
     */
    set transparent(value: boolean);
    /**
     * Get the visible property value
     */
    get visible(): boolean;
    /**
     * Set the visible property value
     * @param value - new visibility value
     */
    set visible(value: boolean);
    /**
     * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Create a new {@link MediaTexture}.
     * @param options - {@link MediaTextureParams | MediaTexture parameters}.
     * @returns - newly created {@link MediaTexture}.
     */
    createMediaTexture(options: MediaTextureParams): MediaTexture;
    /**
     * Create a new {@link Texture}
     * @param  options - {@link TextureParams | Texture parameters}
     * @returns - newly created Texture
     */
    createTexture(options: TextureParams): Texture;
    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture): any;
    /**
     * Assign or remove a {@link RenderTarget} to this Mesh
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setOutputTarget(outputTarget: RenderTarget | null): void;
    /**
     * Assign or remove a {@link RenderBundle} to this Mesh.
     * @param renderBundle - the {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
     * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
     */
    setRenderBundle(renderBundle?: RenderBundle | null, updateScene?: boolean): void;
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
     * Resize the Mesh.
     * @param boundingRect - optional new {@link DOMElementBoundingRect} to use.
     */
    resize(boundingRect?: DOMElementBoundingRect): void;
    /**
     * Resize the {@link textures}.
     */
    resizeTextures(): void;
    /**
     * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
     */
    onBeforeRenderScene(): void;
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
     * Render the {@link material} and {@link geometry}.
     * @param pass - Current render pass encoder.
     */
    renderPass(pass: GPURenderPassEncoder): void;
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
 * Constructor function, that creates a new instance of the given type.
 * @template T - the base constructor
 * @param args - The arguments passed to the constructor.
 * @returns - An instance of the mixin.
 * @ignore
 */
export type MixinConstructor<T = {}> = new (...args: any[]) => T;
/**
 * Used to mix the basic Mesh properties and methods defined in {@link MeshBaseClass} (basically, set a {@link Geometry} and a {@link RenderMaterial} and render them, add helpers to create {@link MediaTexture} and {@link Texture}) with a given Base of type {@link core/objects3D/Object3D.Object3D | Object3D}, {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}, {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} or an empty class.
 * @param Base - the class to mix onto
 * @returns - the mixed classes, creating a basic Mesh.
 */
declare function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase;
export { MeshBaseMixin };
