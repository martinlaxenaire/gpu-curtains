/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryParams, PipelineEntryPropertiesParams, PipelineEntryShaders } from '../../types/PipelineEntries';
/**
 * ComputePipelineEntry class:
 * Used to create a pipeline entry specifically designed to handle compute passes.
 * @extends PipelineEntry
 */
export declare class ComputePipelineEntry extends PipelineEntry {
    /** Shaders to use with this {@link ComputePipelineEntry} */
    shaders: PipelineEntryShaders;
    /** [Compute pipeline descriptor]{@link GPUComputePipelineDescriptor} based on [layout]{@link ComputePipelineEntry#layout} and [shaders]{@link ComputePipelineEntry#shaders} */
    descriptor: GPUComputePipelineDescriptor | null;
    /**
     * ComputePipelineEntry constructor
     * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link ComputePipelineEntry}
     */
    constructor(parameters: PipelineEntryParams);
    /**
     * Set {@link ComputePipelineEntry} properties (in this case the [bind groups]{@link ComputePipelineEntry#bindGroups})
     * @param parameters - the [bind groups]{@link ComputeMaterial#bindGroups} to use
     */
    setPipelineEntryProperties(parameters: PipelineEntryPropertiesParams): void;
    /**
     * Patch the shaders by appending all the [bind groups]{@link ComputePipelineEntry#bindGroups}) WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
     */
    patchShaders(): void;
    /**
     * Create the [shaders]{@link ComputePipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders(): void;
    /**
     * Create the [compute pipeline descriptor]{@link ComputePipelineEntry#descriptor}
     */
    createPipelineDescriptor(): void;
    /**
     * Create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
     */
    createComputePipeline(): void;
    /**
     * Asynchronously create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
     * @async
     * @returns - void promise result
     */
    createComputePipelineAsync(): Promise<void>;
    /**
     * Call [super compilePipelineEntry]{@link PipelineEntry#compilePipelineEntry} method, then create our [compute pipeline]{@link ComputePipelineEntry#pipeline}
     * @async
     */
    compilePipelineEntry(): Promise<void>;
}
