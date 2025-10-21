/// <reference types="@webgpu/types" />
import { Renderer } from '../renderers/utils';
import { SceneStackedMesh, RenderedMesh, ProjectedMesh, SceneStackedObject } from '../renderers/GPURenderer';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { PingPongPlane } from '../../extras/meshes/PingPongPlane';
import { ComputePass } from '../computePasses/ComputePass';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { RenderPass } from '../renderPasses/RenderPass';
import { Texture } from '../textures/Texture';
import { Object3D } from '../objects3D/Object3D';
import { RenderBundle } from '../renderPasses/RenderBundle';
/**
 * Meshes rendering order is dependant of their transparency setting.
 */
export interface ProjectionStack {
    /** opaque Meshes or {@link RenderBundle} will be drawn first */
    opaque: SceneStackedObject[];
    /** transparent Meshes or {@link RenderBundle} will be drawn last */
    transparent: SceneStackedObject[];
}
/** Meshes or render bundles will be stacked in 2 different objects whether they are projected (use a {@link core/cameras/Camera.Camera | Camera}) or not. */
export type ProjectionType = 'unProjected' | 'projected';
/** Meshes or render bundles will be put into two stacks of projected/unprojected transparent and opaques objects arrays. */
export type Stack = Record<ProjectionType, ProjectionStack>;
/**
 * A RenderPassEntry object is used to group Meshes or {@link RenderBundle} based on their rendering target.
 */
export interface RenderPassEntry {
    /** Optional label for this {@link RenderPassEntry}. */
    label?: string;
    /** {@link RenderPass} target used onto which render. */
    renderPass: RenderPass;
    /** {@link Texture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen). */
    renderTexture: Texture | null;
    /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy. */
    onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy. */
    onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** Optional function that can be used to manually create a {@link GPURenderPassEncoder} and create a custom rendering behaviour instead of the regular one. Used internally to render shadows. */
    useCustomRenderPass: ((commandEncoder?: GPUCommandEncoder) => void) | null;
    /** If this {@link RenderPassEntry} needs to render only one Mesh. */
    element: PingPongPlane | ShaderPass | null;
    /** If this {@link RenderPassEntry} needs to render multiple Meshes or {@link RenderBundle}, then use a {@link Stack} object. */
    stack: Stack | null;
}
/** Defines all our possible render targets. */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'prePass' | 'screen' | 'postRenderTarget' | 'postProPass';
/** Defines our render pass entries object. */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>;
/**
 * Used to by the {@link Renderer} to render everything that needs to be rendered (compute passes, meshes and/or render bundles) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 *
 * ## Render order
 *
 * - Run all the {@link ComputePass} first, sorted by their {@link ComputePass#renderOrder | renderOrder}
 * - Then render all {@link renderPassEntries} `pingPong` entries Meshes or {@link RenderBundle}, sorted by their {@link PingPongPlane#renderOrder | renderOrder}.
 * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} outputTarget entries:
 *   - First, the opaque unprojected Meshes (i.e. opaque {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}  or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
 *   - Then, the transparent unprojected Meshes (i.e. transparent {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane} or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
 *   - Then render all {@link renderPassEntries} `prePass` entries {@link ShaderPass}, sorted by their {@link ShaderPass#renderOrder | renderOrder}. This would be mainly used for "blit" passes rendered before the content that needs to be actually rendered on the main screen buffer.
 *   - Then, the opaque projected Meshes (i.e. opaque {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane}) or {@link RenderBundle}, sorted by their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
 *   - Finally, the transparent projected Meshes (i.e. transparent {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane} or {@link RenderBundle}), sorted by their Z position and then their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
 * - Next, all the Meshes that need to be rendered directly to the {@link renderPassEntries} screen main buffer (the {@link Renderer} current texture), in the same order than above. The `screen` {@link renderPassEntries} array can have multiple entries, allowing you to render first a given set of meshes, the perform any operation (like getting the outputted content) before rendering another set of meshes.
 * - Finally, all the post processing {@link ShaderPass} in the `postProPass` {@link renderPassEntries} array.
 */
export declare class Scene extends Object3D {
    #private;
    /** {@link Renderer} used by this {@link Scene} */
    renderer: Renderer;
    /** Array of {@link ComputePass} to render, ordered by {@link ComputePass#renderOrder | renderOrder} */
    computePassEntries: ComputePass[];
    /**
     * A {@link RenderPassEntries} object that will contain every Meshes or {@link RenderBundle} that need to be drawn, put inside each one of our six entries type arrays: `pingPong`, `renderTarget`, `prePass`, `screen`, `postRenderTarget` and `postProPass`.
     * - The {@link Scene} will first render all {@link renderPassEntries} pingPong entries Meshes.
     * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} renderTarget entries.
     * - Finally all Meshes that need to be rendered to the {@link renderPassEntries} screen.
     */
    renderPassEntries: RenderPassEntries;
    /**
     * Scene constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}.
     */
    constructor({ renderer }: {
        renderer: Renderer | GPUCurtains;
    });
    /**
     * Create a new {@link RenderPassEntry} in the {@link renderPassEntries} `screen` array.
     * @param label - Optional label to use for this {@link RenderPassEntry}.
     * @param order - Optional order into which insert this {@link renderPassEntries} `screen` array. A positive number means at the end of the array, a negative number means at the beginning. Default to `1`.
     * @returns - The new {@link RenderPassEntry}.
     */
    createScreenPassEntry(label?: string, order?: number): RenderPassEntry;
    /**
     * Set the main {@link Renderer} render pass entry.
     */
    setMainRenderPassEntry(): void;
    /**
     * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
     * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test.
     */
    getRenderPassEntryLength(renderPassEntry: RenderPassEntry): number;
    /**
     * Add a {@link ComputePass} to our scene {@link computePassEntries} array.
     * @param computePass - {@link ComputePass} to add.
     */
    addComputePass(computePass: ComputePass): void;
    /**
     * Remove a {@link ComputePass} from our scene {@link computePassEntries} array.
     * @param computePass - {@link ComputePass} to remove.
     */
    removeComputePass(computePass: ComputePass): void;
    /**
     * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
     * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}.
     * @param renderTarget - {@link RenderTarget} to add.
     */
    addRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
     * @param renderTarget - {@link RenderTarget} to add.
     */
    removeRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Get the {@link RenderPassEntry} in the {@link renderPassEntries} `renderTarget` array (or `screen` array if no {@link RenderTarget} is passed) corresponding to the given {@link RenderTarget}.
     * @param renderTarget - {@link RenderTarget} to use to retrieve the {@link RenderPassEntry} if any.
     * @returns - {@link RenderPassEntry} found.
     */
    getRenderTargetPassEntry(renderTarget?: RenderTarget | null): RenderPassEntry;
    /**
     * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not.
     * @param mesh - Mesh to check.
     * @returns - The corresponding render pass entry {@link Stack}.
     */
    getMeshProjectionStack(mesh: RenderedMesh): ProjectionStack;
    /**
     * Order a {@link SceneStackedObject} array by using the {@link core/meshes/Mesh.Mesh.renderOrder | renderOrder} or {@link core/meshes/Mesh.Mesh.index | index} properties.
     * @param stack - {@link SceneStackedObject} to sort, filled with {@link RenderedMesh} or {@link RenderBundle}.
     */
    orderStack(stack: SceneStackedObject[]): void;
    /**
     * Test whether a {@link SceneStackedObject} is a {@link RenderBundle} or not.
     * @param object - Object to test.
     * @returns - Whether the object is a {@link RenderBundle} or not.
     */
    isStackObjectRenderBundle(object: SceneStackedObject): object is RenderBundle;
    /**
     * Add a {@link SceneStackedMesh} to the given {@link RenderTarget} corresponding {@link RenderPassEntry}.
     * @param mesh - {@link SceneStackedMesh} to add.
     * @param renderTarget - {@link RenderTarget} to get the {@link RenderPassEntry} from. If not set, will add to the first {@link renderPassEntries} `screen` array entry.
     */
    addMeshToRenderTargetStack(mesh: SceneStackedMesh, renderTarget?: RenderTarget | null): void;
    /**
     * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}.
     * @param mesh - Mesh to add.
     */
    addMesh(mesh: SceneStackedMesh): void;
    /**
     * Remove a Mesh from our {@link Scene}.
     * @param mesh - Mesh to remove.
     */
    removeMesh(mesh: SceneStackedMesh): void;
    /**
     * Add a {@link RenderBundle} to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * @param renderBundle - {@link RenderBundle} to add.
     * @param projectionStack - {@link ProjectionStack} onto which to add the {@link RenderBundle}.
     */
    addRenderBundle(renderBundle: RenderBundle, projectionStack: ProjectionStack): void;
    /**
     * Remove a {@link RenderBundle} from our {@link Scene}.
     * @param renderBundle - {@link RenderBundle} to remove.
     */
    removeRenderBundle(renderBundle: RenderBundle): void;
    /**
     * Add a {@link ShaderPass} to our scene {@link renderPassEntries} `prePass` or `postProPass` array.
     * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}.
     * This also handles the {@link renderPassEntries} `postProPass` array entries order: We will first draw selective passes and then finally global post processing passes.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
     * @param shaderPass - {@link ShaderPass} to add.
     */
    addShaderPass(shaderPass: ShaderPass): void;
    /**
     * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} `prePass` or `postProPass` array.
     * @param shaderPass - {@link ShaderPass} to remove.
     */
    removeShaderPass(shaderPass: ShaderPass): void;
    /**
     * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
     * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}.
     * @param pingPongPlane - {@link PingPongPlane} to add.
     */
    addPingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
     * @param pingPongPlane - {@link PingPongPlane} to remove.
     */
    removePingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
     * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
     * @returns - The {@link RenderPassEntry} if found.
     */
    getObjectRenderPassEntry(object: RenderedMesh | RenderTarget): RenderPassEntry | undefined;
    /**
     * Sort transparent projected meshes by their render order or distance to the camera (farther meshes should be drawn first).
     * @param meshes - Transparent projected meshes array to sort.
     */
    sortTransparentMeshes(meshes: Array<ProjectedMesh | RenderBundle>): void;
    /**
     * Here we render a {@link RenderPassEntry}:
     * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture.
     * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified.
     * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}.
     * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes.
     * - End the {@link GPURenderPassEncoder | GPU render pass encoder}.
     * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified.
     * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     * @param renderPassEntry - {@link RenderPassEntry} to render.
     */
    renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry): void;
    /**
     * Before actually rendering the scene, update matrix stack and frustum culling checks. Batching these calls greatly improve performance. Called by the {@link renderer} before rendering.
     */
    onBeforeRender(): void;
    /**
     * Render our {@link Scene}.
     * - Execute {@link onBeforeRender} first.
     * - Then render {@link computePassEntries}.
     * - And finally render our {@link renderPassEntries}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     */
    render(commandEncoder: GPUCommandEncoder): void;
}
