/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryParams, PipelineEntryShaders, RenderPipelineEntryPropertiesParams } from '../../types/PipelineEntries';
import { RenderMaterialAttributes } from '../../types/Materials';
/**
 * RenderPipelineEntry class:
 * Used to create a pipeline entry specifically designed to draw meshes.
 * @extends PipelineEntry
 */
export declare class RenderPipelineEntry extends PipelineEntry {
    /** Shaders to use with this {@link RenderPipelineEntry} */
    shaders: PipelineEntryShaders;
    /** [Geometry attributes]{@link RenderMaterialAttributes} sent to the {@link RenderPipelineEntry} */
    attributes: RenderMaterialAttributes;
    /** [Renderer pipeline descriptor]{@link GPURenderPipelineDescriptor} based on [layout]{@link RenderPipelineEntry#layout} and [shaders]{@link RenderPipelineEntry#shaders} */
    descriptor: GPURenderPipelineDescriptor | null;
    /**
     * RenderPipelineEntry constructor
     * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters: PipelineEntryParams);
    /**
     * Merge our [pipeline entry bind groups]{@link RenderPipelineEntry#bindGroups} with the [camera bind group]{@link CameraRenderer#cameraBindGroup} if needed and set them
     * @param bindGroups - [bind groups]{@link RenderMaterial#bindGroups} to use with this {@link RenderPipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups: any): void;
    /**
     * Set {@link RenderPipelineEntry} properties (in this case the [bind groups]{@link RenderPipelineEntry#bindGroups} and [attributes]{@link RenderPipelineEntry#attributes}) and create the [pipeline]{@link RenderPipelineEntry#pipeline} itself
     * @param parameters - the [bind groups]{@link RenderMaterial#bindGroups} and [attributes]{@link RenderMaterial#attributes} to use
     */
    setPipelineEntryProperties(parameters: RenderPipelineEntryPropertiesParams): void;
    /**
     * Patch the shaders by appending all the necessary shader chunks, [bind groups]{@link RenderPipelineEntry#bindGroups}) and [attributes]{@link RenderPipelineEntry#attributes} WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
     */
    patchShaders(): void;
    /**
     * Create the [shaders]{@link RenderPipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders(): void;
    /**
     * Create the [render pipeline descriptor]{@link RenderPipelineEntry#descriptor}
     */
    createPipelineDescriptor(): void;
    /**
     * Create the [render pipeline]{@link RenderPipelineEntry#pipeline}
     */
    createRenderPipeline(): void;
    /**
     * Asynchronously create the [render pipeline]{@link RenderPipelineEntry#pipeline}
     * @async
     * @returns - void promise result
     */
    createRenderPipelineAsync(): Promise<void>;
    /**
     * Call [super setPipelineEntry]{@link PipelineEntry#setPipelineEntry} method, then create our [render pipeline]{@link RenderPipelineEntry#pipeline}
     */
    setPipelineEntry(): void;
}
