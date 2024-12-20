/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { RenderedMesh, SceneStackedMesh } from '../renderers/GPURenderer';
import { BufferBinding } from '../bindings/BufferBinding';
import { RenderPass } from './RenderPass';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { IndirectBuffer } from '../../extras/buffers/IndirectBuffer';
/** Options used to create a {@link RenderBundle}. */
export interface RenderBundleOptions {
    /** The label of the {@link RenderBundle}, sent to various GPU objects for debugging purpose. */
    label: string;
    /** The {@link RenderPass} used to describe the {@link RenderBundle#descriptor | RenderBundle encoder descriptor}. Default to the first added mesh output target if not set (usually the {@link Renderer#renderPass | renderer main render pass} or {@link Renderer#postProcessingPass | renderer post processing pass}). */
    renderPass: RenderPass;
    /** Whether the {@link RenderBundle} should handle all its child {@link core/renderers/GPURenderer.ProjectedMesh | meshes} transformation matrices with a single {@link GPUBuffer}. Can greatly improve performance when dealing with a lot of moving objects, but the {@link size} parameter has to be set upon creation and should not change afterwards. Default to `false`. */
    useBuffer: boolean;
    /** Fixed size (number of meshes) of the {@link RenderBundle}. Mostly useful when using the {@link useBuffer} parameter. */
    size: number;
    /** Whether this {@link RenderBundle} should create its own {@link IndirectBuffer} and add its {@link RenderBundle#meshes | meshes} geometries to it. Default to `false`. */
    useIndirectDraw: boolean;
}
/** Parameters used to created a {@link RenderBundle}. */
export interface RenderBundleParams extends Partial<RenderBundleOptions> {
    /** Controls the order in which this {@link RenderBundle} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
    renderOrder?: number;
    /** Whether this {@link RenderBundle} should be added to our {@link core/scenes/Scene.Scene | Scene} transparent stack (drawn after the opaque stack). */
    transparent?: boolean;
    /** Whether this {@link RenderBundle} content should be drawn. */
    visible?: boolean;
}
/**
 * Used to create a {@link GPURenderBundle} and its associated {@link GPURenderBundleEncoder}.
 *
 * Render bundle are a powerful tool that can significantly reduce the amount of CPU time spent issuing repeated rendered commands. In other words, it can be used to draw given set of meshes that share the same {@link RenderPass | output target} faster (up to 1.5x in some cases) and with less CPU overhead.
 *
 * The main drawback is that {@link RenderBundle} works best when the number of meshes drawn is known in advance and is not subject to change.
 *
 * @example
 * ```javascript
 * const nbMeshes = 100
 *
 * // assuming 'renderer' is a valid renderer or curtains instance
 * const renderBundle = new RenderBundle(renderer, {
 *   label: 'Custom render bundle',
 *   size: nbMeshes,
 *   useBuffer: true, // use a single buffer to handle all 100 meshes transformations
 * })
 *
 * for (let i = 0; i < nbMeshes; i++) {
 *   const mesh = new Mesh(renderer, {
 *     label: 'Cube ' + i,
 *     geometry: new BoxGeometry(),
 *     renderBundle,
 *   })
 *
 *   mesh.onBeforeRender(() => {
 *     mesh.rotation.y += 0.02
 *   })
 * }
 * ```
 */
export declare class RenderBundle {
    #private;
    /** The type of the {@link RenderBundle}. */
    type: string;
    /** The universal unique id of this {@link RenderBundle}. */
    readonly uuid: string;
    /** Index of this {@link RenderBundle}, i.e. creation order. */
    readonly index: number;
    /** The {@link Renderer} used to create this {@link RenderBundle}. */
    renderer: Renderer;
    /** Options used to create this {@link RenderBundle}. */
    options: RenderBundleOptions;
    /** Controls the order in which this {@link RenderBundle} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
    renderOrder: number;
    /** Whether this {@link RenderBundle} should be added to our {@link core/scenes/Scene.Scene | Scene} transparent stack (drawn after the opaque stack). */
    transparent: boolean | null;
    /** Whether this {@link RenderBundle} content should be drawn. */
    visible: boolean;
    /** Optional {@link BufferBinding} created if the {@link RenderBundleParams#useBuffer | useBuffer} parameter has been set to `true` and if the {@link meshes} drawn actually have transformation matrices. This {@link BufferBinding} will act as a parent buffer, and the {@link meshes} `matrices` binding will use a {@link BufferBinding} with this {@link binding} as parent and the correct `offset`. */
    binding: BufferBinding | null;
    /** Optional internal {@link IndirectBuffer} containing all {@link meshes} unique geometries to render them using indirect drawing. */
    indirectBuffer: IndirectBuffer | null;
    /** The {@link GPURenderBundleEncoderDescriptor} created by this {@link RenderBundle}, based on the {@link RenderPass} passed as parameters. */
    descriptor: GPURenderBundleEncoderDescriptor;
    /** The {@link GPURenderBundleEncoder} created by this {@link RenderBundle}. */
    encoder: GPURenderBundleEncoder | null;
    /** The {@link GPURenderBundle} created by this {@link RenderBundle}. */
    bundle: GPURenderBundle | null;
    /** A {@link Map} of {@link RenderedMesh | mesh} drawn by this {@link RenderBundle}. */
    meshes: Map<RenderedMesh['uuid'], RenderedMesh>;
    /**
     * RenderBundle constructor
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link RenderBundle}.
     * @param parameters - {@link RenderBundleParams | parameters} use to create this {@link RenderBundle}.
     */
    constructor(renderer: Renderer | GPUCurtains, { label, renderPass, renderOrder, transparent, visible, size, useBuffer, useIndirectDraw, }?: RenderBundleParams);
    /**
     * Get whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not (useful to know in which {@link core/scenes/Scene.Scene | Scene} stack it has been added.
     * @readonly
     * @returns - Whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
     */
    get useProjection(): boolean | null;
    /**
     * Set whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
     * @param value - New projection value.
     */
    set useProjection(value: boolean);
    /**
     * Set the new {@link RenderBundle} size. Should be used before adding or removing {@link meshes} to the {@link RenderBundle} if the {@link bundle} has already been created (especially if it's using a {@link binding}).
     * @param value - New size to set.
     */
    set size(value: number);
    /**
     * Get whether our {@link RenderBundle} is ready.
     * @readonly
     * @returns - Whether our {@link RenderBundle} is ready.
     */
    get ready(): boolean;
    /**
     * Set whether our {@link RenderBundle} is ready and encode it if needed.
     * @param value - New ready state.
     */
    set ready(value: boolean);
    /**
     * Called by the {@link core/scenes/Scene.Scene | Scene} to eventually add a {@link RenderedMesh | mesh} to this {@link RenderBundle}. Can set the {@link RenderBundleOptions#renderPass | render pass} if needed. If the {@link RenderBundleOptions#renderPass | render pass} is already set and the {@link mesh} output {@link RenderPass} does not match, it won't be added.
     * @param mesh - {@link RenderedMesh | Mesh} to eventually add.
     * @param outputPass - The mesh output {@link RenderPass}.
     */
    addMesh(mesh: RenderedMesh, outputPass: RenderPass): void;
    /**
     * Remove any {@link RenderedMesh | rendered mesh} from this {@link RenderBundle}.
     * @param mesh - {@link RenderedMesh | Mesh} to remove.
     */
    removeSceneObject(mesh: RenderedMesh): void;
    /**
     * Remove a {@link SceneStackedMesh | scene stacked mesh} from this {@link RenderBundle}.
     * @param mesh - {@link SceneStackedMesh | Scene stacked mesh} to remove.
     * @param keepMesh - Whether to preserve the {@link mesh} in order to render it normally again. Default to `true`.
     */
    removeMesh(mesh: SceneStackedMesh, keepMesh?: boolean): void;
    /**
     * Update the {@link binding} buffer if needed.
     */
    updateBinding(): void;
    /**
     * Render the {@link RenderBundle}.
     *
     * If it is ready, execute each {@link RenderedMesh#onBeforeRenderPass | mesh onBeforeRenderPass method}, {@link updateBinding | update the binding} if needed, execute the {@link bundle} and finally execute each {@link RenderedMesh#onAfterRenderPass | mesh onAfterRenderPass method}.
     *
     * If not, just render its {@link meshes} as usual and check whether they are all ready and if we can therefore encode our {@link RenderBundle}.
     * @param pass - {@link GPURenderPassEncoder} to use.
     */
    render(pass: GPURenderPassEncoder): void;
    /**
     * Called when the {@link Renderer#device | WebGPU device} has been lost.
     * Just set the {@link ready} flag to `false` to eventually invalidate the {@link bundle}.
     */
    loseContext(): void;
    /**
     * Empty the {@link RenderBundle}. Can eventually re-add the {@link SceneStackedMesh | scene stacked meshes} to the {@link core/scenes/Scene.Scene | Scene} in order to render them normally again.
     * @param keepMeshes - Whether to preserve the {@link meshes} in order to render them normally again. Default to `true`.
     */
    empty(keepMeshes?: boolean): void;
    /**
     * Remove the {@link RenderBundle}, i.e. destroy it while preserving the {@link SceneStackedMesh | scene stacked meshes} by re-adding them to the {@link core/scenes/Scene.Scene | Scene}.
     */
    remove(): void;
    /**
     * Remove the {@link RenderBundle} from our {@link core/scenes/Scene.Scene | Scene}, {@link RenderedMesh#remove | remove the meshes}, eventually destroy the {@link binding} and remove the {@link RenderBundle} from the {@link Renderer}.
     */
    destroy(): void;
}
