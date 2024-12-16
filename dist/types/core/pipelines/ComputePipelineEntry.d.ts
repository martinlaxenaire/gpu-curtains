/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryParams, PipelineEntryShaders } from '../../types/PipelineEntries';
/**
 * Used to create a {@link PipelineEntry} specifically designed to handle {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}.
 *
 * ## Shaders patching
 *
 * The {@link ComputePipelineEntry} uses each of its {@link ComputePipelineEntry#bindGroups | bind groups} {@link core/bindings/Binding.Binding | Binding} to patch the given compute shader before creating the {@link GPUShaderModule}.<br>
 * It will prepend every {@link core/bindings/Binding.Binding | Binding} WGSL code snippets (or fragments) with the correct bind group and bindings indices.
 *
 * ## Pipeline compilation
 *
 * The {@link ComputePipelineEntry} will then create a {@link GPUComputePipeline} (asynchronously by default).
 */
export declare class ComputePipelineEntry extends PipelineEntry {
    /** Shaders to use with this {@link ComputePipelineEntry} */
    shaders: PipelineEntryShaders;
    /** {@link GPUComputePipelineDescriptor | Compute pipeline descriptor} based on {@link layout} and {@link shaders} */
    descriptor: GPUComputePipelineDescriptor | null;
    /**
     * ComputePipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link ComputePipelineEntry}
     */
    constructor(parameters: PipelineEntryParams);
    /**
     * Patch the shaders by appending all the {@link bindGroups | bind groups}) WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders(): void;
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders(): void;
    /**
     * Create the compute pipeline {@link descriptor}
     */
    createPipelineDescriptor(): void;
    /**
     * Create the compute {@link pipeline}
     */
    createComputePipeline(): void;
    /**
     * Asynchronously create the compute {@link pipeline}
     * @async
     * @returns - void promise result
     */
    createComputePipelineAsync(): Promise<void>;
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our compute {@link pipeline}
     * @async
     */
    compilePipelineEntry(): Promise<void>;
}
