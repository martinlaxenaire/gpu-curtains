/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement, BindGroupEntries, BindGroupParams, ReadOnlyInputBindings } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { TextureBindGroupParams } from './TextureBindGroup';
import { BufferBindingType } from '../bindings/Binding';
/**
 * Used to handle all inputs data sent to the GPU.<br>
 * In WebGPU, data (buffers, textures or samplers, called bindings) are organised by bind groups, containing those bindings.
 *
 * ## Bindings
 *
 * A {@link BindGroup} is responsible for creating each {@link BufferBinding} {@link GPUBuffer} and then the {@link GPUBindGroup} and {@link GPUBindGroupLayout} that are used to create {@link GPUComputePipeline} or {@link GPURenderPipeline}.<br>
 * Those are generally automatically created by the {@link core/materials/Material.Material | Material} using this {@link BindGroup}. If you need to manually create them, you will have to call its {@link BindGroup#createBindGroup | `createBindGroup()` method}
 *
 * ### Samplers and textures
 *
 * A {@link BindGroup} is best suited to handle {@link GPUBuffer} only bindings. If you need to handle {@link GPUSampler}, a {@link GPUTexture} or a {@link GPUExternalTexture}, you should use a {@link core/bindGroups/TextureBindGroup.TextureBindGroup | TextureBindGroup} instead.
 *
 * ### Updating a GPUBindGroup or GPUBindGroupLayout
 *
 * Each time one of the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#resource | binding resource} changes, its {@link BindGroup#bindGroup | bindGroup} will be recreated (usually, when a {@link GPUTexture} is uploaded).<br>
 * Each time one of the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#resource_layout_objects | binding resource layout} changes, its {@link BindGroup#bindGroupLayout | bindGroupLayout} and {@link BindGroup#bindGroup | bindGroup} will be recreated, and the {@link GPUComputePipeline} or {@link GPURenderPipeline} will be recreated as well.
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
 * const bindGroup = new BindGroup(gpuCurtains, {
 *   label: 'My bind group',
 *   uniforms: {
 *     params: {
 *       visibility: ['fragment'],
 *       struct: {
 *         opacity: {
 *           value: 'f32',
 *           value: 1,
 *         },
 *         mousePosition: {
 *           value: 'vec2f',
 *           value: new Vec2(),
 *         },
 *       },
 *     },
 *   },
 * })
 *
 * // create the GPU buffer, bindGroupLayout and bindGroup
 * bindGroup.createBindGroup()
 * ```
 */
export declare class BindGroup {
    /** The type of the {@link BindGroup} */
    type: string;
    /** The universal unique id of the {@link BindGroup} */
    uuid: string;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Options used to create this {@link BindGroup} */
    options: TextureBindGroupParams;
    /** Index of this {@link BindGroup}, used to link struct in the shaders */
    index: number;
    /** List of {@link BindGroupBindingElement | bindings} (buffers, texture, etc.) handled by this {@link BindGroup} */
    bindings: BindGroupBindingElement[];
    /** Our {@link BindGroup} {@link BindGroupEntries | entries} objects */
    entries: BindGroupEntries;
    /** Our {@link BindGroup}{@link GPUBindGroupLayout} */
    bindGroupLayout: null | GPUBindGroupLayout;
    /** Our {@link BindGroup} {@link GPUBindGroup} */
    bindGroup: null | GPUBindGroup;
    /** A cache key allowing to get / set {@link GPUBindGroupLayout} from the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#bindGroupLayouts | device manager map cache}. */
    layoutCacheKey: string;
    /** A cache key allowing the {@link core/pipelines/PipelineManager.PipelineManager | PipelineManager} to compare {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry} bind groups content. */
    pipelineCacheKey: string;
    /** Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup} s*/
    needsPipelineFlush: boolean;
    /** A Set to store this {@link BindGroup} consumers ({@link core/materials/Material.Material#uuid | Material uuid})  */
    consumers: Set<string>;
    /**
     * BindGroup constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, uniforms, storages }?: BindGroupParams);
    /**
     * Sets our {@link BindGroup#index | bind group index}
     * @param index - {@link BindGroup#index | bind group index} to set
     */
    setIndex(index: number): void;
    /**
     * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param bindings - {@link bindings} to add
     */
    addBindings(bindings?: BindGroupBindingElement[]): void;
    /**
     * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param binding - binding to add
     */
    addBinding(binding: BindGroupBindingElement): void;
    destroyBufferBinding(binding: BindGroupBufferBindingElement): void;
    /**
     * Creates Bindings based on a list of inputs
     * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}
     * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding
     * @returns - a {@link bindings} array
     */
    createInputBindings(bindingType?: BufferBindingType, inputs?: ReadOnlyInputBindings): BindGroupBindingElement[];
    /**
     * Create and adds {@link bindings} based on inputs provided upon creation
     */
    setInputBindings(): void;
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link bindings} and has not been created yet
     * @readonly
     */
    get shouldCreateBindGroup(): boolean;
    /**
     * Reset our {@link BindGroup} {@link entries}
     */
    resetEntries(): void;
    /**
     * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
     */
    createBindGroup(): void;
    /**
     * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}
     */
    resetBindGroup(): void;
    /**
     * Add a {@link BindGroup#entries.bindGroup | bindGroup entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupEntry(binding: BindGroupBindingElement): void;
    /**
     * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
     */
    resetBindGroupLayout(): void;
    /**
     * Add a {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupLayoutEntry(binding: BindGroupBindingElement): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to update our bindings.
     */
    restoreContext(): void;
    /**
     * Get all {@link BindGroup#bindings | bind group bindings} that handle a {@link GPUBuffer}
     */
    get bufferBindings(): BindGroupBufferBindingElement[];
    /**
     * Creates binding GPUBuffer with correct params
     * @param binding - the binding element
     */
    createBindingBuffer(binding: BindGroupBufferBindingElement): void;
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer struct, create a GPUBuffer first if needed
     */
    fillEntries(): void;
    /**
     * Get a bind group binding by name/key
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName?: string): BindGroupBindingElement | null;
    /**
     * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
     */
    setBindGroupLayout(): void;
    /**
     * Create a GPUBindGroup and set our {@link bindGroup}
     */
    setBindGroup(): void;
    /**
     * Check whether we should update (write) our {@link GPUBuffer} or not.
     */
    updateBufferBindings(): void;
    /**
     * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
     * Called at each render from the parentMesh {@link core/materials/Material.Material | material}
     */
    update(): void;
    /**
     * Clones a {@link BindGroup} from a list of {@link bindings}
     * Useful to create a new bind group with already created buffers, but swapped
     * @param parameters - parameters to use for cloning
     * @param parameters.bindings - our input {@link bindings}
     * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not
     * @returns - the cloned {@link BindGroup}
     */
    clone({ bindings, keepLayout, }?: {
        bindings?: BindGroupBindingElement[];
        keepLayout?: boolean;
    }): AllowedBindGroups;
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy(): void;
}
