/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { MeshType } from '../renderers/GPURenderer';
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
    opaque: MeshType[];
    /** transparent Meshes will be drawn last */
    transparent: MeshType[];
}
/** Meshes will be stacked in 2 different objects whether they are projected (use a {@link Camera}) or not */
export type ProjectionType = 'unProjected' | 'projected';
/**
 * Meshes will be put into two stacks of projected/unprojected transparent and opaques meshes arrays
 */
export type Stack = Record<ProjectionType, ProjectionStack>;
/**
 * A RenderPassEntry object is used to group Meshes based on their rendering target
 */
export interface RenderPassEntry {
    /** [render pass]{@link RenderPass} target used onto which render */
    renderPass: RenderPass;
    /** [render texture]{@link RenderTexture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen) */
    renderTexture: RenderTexture | null;
    /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy */
    onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy */
    onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    /** If this {@link RenderPassEntry} needs to render only one Mesh */
    element: MeshType | ShaderPass | PingPongPlane | null;
    /** If this {@link RenderPassEntry} needs to render multiple Meshes, then use a {@link Stack} object */
    stack: Stack | null;
}
/** Defines all our possible render targets */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen';
/** Defines our render pass entries object */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>;
/**
 * Scene class:
 * Used to render everything that needs to be rendered (compute passes and meshes) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 */
export declare class Scene {
    /** [renderer]{@link Renderer} used by this {@link Scene} */
    renderer: Renderer;
    /** Array of [compute passes]{@link ComputePass} to render, ordered by [render order]{@link ComputePass#renderOrder} */
    computePassEntries: ComputePass[];
    /**
     * A {@link RenderPassEntries} object that will contain every Meshes that need to be drawn, put inside each one of our three entries type arrays: 'pingPong', 'renderTarget' and 'screen'.
     * The {@link Scene} will first render all [pingPong entries]{@link Scene#renderPassEntries.pingPong} Meshes, then all Meshes that need to be rendered into specific [renderTarget entries]{@link Scene#renderPassEntries.renderTarget} and finally all Meshes that need to be rendered to the [screen]{@link Scene#renderPassEntries.screen}
     */
    renderPassEntries: RenderPassEntries;
    /**
     * Scene constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
     */
    constructor({ renderer }: {
        renderer: Renderer | GPUCurtains;
    });
    /**
     * Add a [compute pass]{@link ComputePass} to our scene [computePassEntries array]{@link Scene#computePassEntries}
     * @param computePass - [compute pass]{@link ComputePass} to add
     */
    addComputePass(computePass: ComputePass): void;
    /**
     * Remove a [compute pass]{@link ComputePass} from our scene [computePassEntries array]{@link Scene#computePassEntries}
     * @param computePass - [compute pass]{@link ComputePass} to remove
     */
    removeComputePass(computePass: ComputePass): void;
    /**
     * Add a [render target]{@link RenderTarget} to our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
     * Every Meshes later added to this [render target]{@link RenderTarget} will be rendered to the [render target render texture]{@link RenderTarget#renderTexture} using the [render target render pass descriptor]{@link RenderTarget#renderPass.descriptor}
     * @param renderTarget - [render target]{@link RenderTarget} to add
     */
    addRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Remove a [render target]{@link RenderTarget} from our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
     * @param renderTarget - [render target]{@link RenderTarget} to add
     */
    removeRenderTarget(renderTarget: RenderTarget): void;
    /**
     * Get the correct [render pass entry]{@link Scene#renderPassEntries} (either [renderTarget]{@link Scene#renderPassEntries.renderTarget} or [screen]{@link Scene#renderPassEntries.screen}) [stack]{@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
     * @param mesh - Mesh to check
     * @returns - the corresponding [render pass entry stack]{@link Stack}
     */
    getMeshProjectionStack(mesh: MeshType): ProjectionStack;
    /**
     * Add a Mesh to the correct [render pass entry]{@link Scene#renderPassEntries} [stack]{@link Stack} array.
     * Meshes are then ordered by their [indexes (order of creation]){@link MeshBase#index}, position along the Z axis in case they are transparent and then [renderOrder]{@link MeshBase#renderOrder}
     * @param mesh - Mesh to add
     */
    addMesh(mesh: MeshType): void;
    /**
     * Remove a Mesh from our {@link Scene}
     * @param mesh - Mesh to remove
     */
    removeMesh(mesh: MeshType): void;
    /**
     * Add a [shader pass]{@link ShaderPass} to our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}.
     * Before rendering the [shader pass]{@link ShaderPass}, we will copy the correct input texture into its [render texture]{@link ShaderPass#renderTexture}
     * This also handles the [renderPassEntries screen array]{@link Scene#renderPassEntries.screen} entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
     * @param shaderPass - [shader pass]{@link ShaderPass} to add
     */
    addShaderPass(shaderPass: ShaderPass): void;
    /**
     * Remove a [shader pass]{@link ShaderPass} from our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}
     * @param shaderPass - [shader pass]{@link ShaderPass} to remove
     */
    removeShaderPass(shaderPass: ShaderPass): void;
    /**
     * Add a [ping pong plane]{@link PingPongPlane} to our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
     * After rendering the [ping pong plane]{@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture} so we'll be able to use it as an input for the next pass
     * @param pingPongPlane
     */
    addPingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Remove a [ping pong plane]{@link PingPongPlane} from our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
     * @param pingPongPlane - [ping pong plane]{@link PingPongPlane} to remove
     */
    removePingPongPlane(pingPongPlane: PingPongPlane): void;
    /**
     * Here we render a [render pass entry]{@link RenderPassEntry}:
     * - Set its [render pass descriptor]{@link RenderPass#descriptor} resolve target and get it at as swap chain texture
     * - Execute [onBeforeRenderPass]{@link RenderPassEntry#onBeforeRenderPass} callback if specified
     * - Begin the [render pass]{@link GPURenderPassEncoder} using our [render pass descriptor]{@link RenderPass#descriptor}
     * - Render the single element if specified or the [render pass entry stack]{@link Stack}: draw unprojected opaque / transparent meshes first, then set [camera bind group]{@link CameraRenderer#cameraBindGroup} and draw projected opaque / transparent meshes
     * - End the [render pass]{@link GPURenderPassEncoder}
     * - Execute [onAfterRenderPass]{@link RenderPassEntry#onAfterRenderPass} callback if specified
     * - Reset [pipeline manager current pipeline]{@link PipelineManager#currentPipelineIndex}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param renderPassEntry - [entry]{@link RenderPassEntry} to render
     */
    renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry): void;
    /**
     * Render our {@link Scene}
     * - Render [compute pass entries]{@link Scene#computePassEntries} first
     * - Then our [render pass entries]{@link Scene#renderPassEntries}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder: GPUCommandEncoder): void;
    /**
     * Execute this at each render after our [command encoder]{@link GPUCommandEncoder} has been submitted.
     * Used to map writable storages buffers if needed.
     */
    onAfterCommandEncoder(): void;
}
