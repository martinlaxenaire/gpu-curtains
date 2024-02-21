/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { ProjectedMesh, RenderedMesh } from '../renderers/GPURenderer';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane';
import { ComputePass } from '../computePasses/ComputePass';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { RenderPass } from '../renderPasses/RenderPass';
import { RenderTexture } from '../textures/RenderTexture';
/**
 * Meshes rendering order is dependant of their transparency setting
 */
export interface ProjectionStack {
    /** opaque Meshes will be drawn first */
    opaque: ProjectedMesh[];
    /** transparent Meshes will be drawn last */
    transparent: ProjectedMesh[];
}
/** Meshes will be stacked in 2 different objects whether they are projected (use a {@link core/camera/Camera.Camera | Camera}) or not */
export type ProjectionType = 'unProjected' | 'projected';
/**
 * Meshes will be put into two stacks of projected/unprojected transparent and opaques meshes arrays
 */
export type Stack = Record<ProjectionType, ProjectionStack>;
/**
 * A RenderPassEntry object is used to group Meshes based on their rendering target
 */
export interface RenderPassEntry {
    /** {@link RenderPass} target used onto which render */
    renderPass: RenderPass;
    /** {@link RenderTexture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen) */
    renderTexture: RenderTexture | null;
    /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy */
    onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy */
    onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** If this {@link RenderPassEntry} needs to render only one Mesh */
    element: PingPongPlane | ShaderPass | null;
    /** If this {@link RenderPassEntry} needs to render multiple Meshes, then use a {@link Stack} object */
    stack: Stack | null;
}
/** Defines all our possible render targets */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen';
/** Defines our render pass entries object */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>;
/**
 * Used to by the {@link Renderer} render everything that needs to be rendered (compute passes and meshes) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 *
 * ## Render order
 *
 * - Run all the {@link ComputePass} first, sorted by their {@link ComputePass#renderOrder | renderOrder}
 * - Then render all {@link renderPassEntries} pingPong entries Meshes, sorted by their {@link PingPongPlane#renderOrder | renderOrder}
 * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} outputTarget entries:
 *   - First, the opaque unprojected Meshes (i.e. opaque {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}
 *   - Then, the transparent unprojected Meshes (i.e. transparent {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}
 *   - Then, the opaque projected Meshes (i.e. opaque {@link core/meshes/Mesh.Mesh | Mesh}, {@link DOMMesh} or {@link Plane}), sorted by their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}
 *   - Finally, the transparent projected Meshes (i.e. transparent {@link core/meshes/Mesh.Mesh | Mesh}, {@link DOMMesh} or {@link Plane}), sorted by their Z position and then their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}
 * - Finally all Meshes that need to be rendered directly to the {@link renderPassEntries} screen (the {@link Renderer} current texture), in the same order than above.
 */
export declare class Scene {
    /** {@link Renderer} used by this {@link Scene} */
    renderer: Renderer;
    /** Array of {@link ComputePass} to render, ordered by {@link ComputePass#renderOrder | renderOrder} */
    computePassEntries: ComputePass[];
    /**
     * A {@link RenderPassEntries} object that will contain every Meshes that need to be drawn, put inside each one of our three entries type arrays: 'pingPong', 'outputTarget' and 'screen'.
     * - The {@link Scene} will first render all {@link renderPassEntries} pingPong entries Meshes
     * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} outputTarget entries
     * - Finally all Meshes that need to be rendered to the {@link renderPassEntries} screen
     */
    renderPassEntries: RenderPassEntries;
    /**
     * Scene constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
     */
    constructor({ renderer }: {
        renderer: Renderer | GPUCurtains;
    });
    /**
     * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
     * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test
     */
    getRenderPassEntryLength(renderPassEntry: RenderPassEntry): number;
    /**
     * Add a {@link ComputePass} to our scene {@link computePassEntries} array
     * @param computePass - {@link ComputePass} to add
     */
    addComputePass(computePass: ComputePass): void;
    /**
     * Remove a {@link ComputePass} from our scene {@link computePassEntries} array
     * @param computePass - {@link ComputePass} to remove
     */
    removeComputePass(computePass: ComputePass): void;
    /**
     * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
     * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget RenderTexture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
     * @param renderTarget - {@link RenderTarget} to add
     */
    addRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
     * @param renderTarget - {@link RenderTarget} to add
     */
    removeRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
     * @param mesh - Mesh to check
     * @returns - the corresponding render pass entry {@link Stack}
     */
    getMeshProjectionStack(mesh: ProjectedMesh): ProjectionStack;
    /**
     * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, position along the Z axis in case they are transparent and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
     * @param mesh - Mesh to add
     */
    addMesh(mesh: ProjectedMesh): void;
    /**
     * Remove a Mesh from our {@link Scene}
     * @param mesh - Mesh to remove
     */
    removeMesh(mesh: ProjectedMesh): void;
    /**
     * Add a {@link ShaderPass} to our scene {@link renderPassEntries} screen array.
     * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}
     * This also handles the {@link renderPassEntries} screen array entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
     * @param shaderPass - {@link ShaderPass} to add
     */
    addShaderPass(shaderPass: ShaderPass): void;
    /**
     * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} screen array
     * @param shaderPass - {@link ShaderPass} to remove
     */
    removeShaderPass(shaderPass: ShaderPass): void;
    /**
     * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
     * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}
     * @param pingPongPlane
     */
    addPingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
     * @param pingPongPlane - {@link PingPongPlane} to remove
     */
    removePingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
     * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
     * @returns - the {@link RenderPassEntry} if found
     */
    getObjectRenderPassEntry(object: RenderedMesh | RenderTarget): RenderPassEntry | undefined;
    /**
     * Here we render a {@link RenderPassEntry}:
     * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
     * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
     * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
     * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link CameraRenderer#cameraBindGroup | camera bind group} and draw projected opaque / transparent meshes
     * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
     * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
     * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param renderPassEntry - {@link RenderPassEntry} to render
     */
    renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry): void;
    /**
     * Render our {@link Scene}
     * - Render {@link computePassEntries} first
     * - Then our {@link renderPassEntries}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder: GPUCommandEncoder): void;
}
