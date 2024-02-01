/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryShaders, RenderPipelineEntryOptions, RenderPipelineEntryParams, RenderPipelineEntryPropertiesParams } from '../../types/PipelineEntries';
import { AllowedBindGroups } from '../../types/BindGroups';
import { RenderMaterialAttributes } from '../../types/Materials';
/**
 * Used to create a {@link PipelineEntry} specifically designed to handle {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
 *
 * ## Shaders patching
 *
 * The {@link RenderPipelineEntry} uses each of its {@link RenderPipelineEntry#bindGroups | bind groups} {@link core/bindings/Binding.Binding | Binding} to patch the given compute shader before creating the {@link GPUShaderModule}.<br>
 * It will prepend every {@link core/bindings/Binding.Binding | Binding} WGSL code snippets (or fragments) with the correct bind group and bindings indices.
 *
 * ## Pipeline compilation
 *
 * The {@link RenderPipelineEntry} will then create a {@link GPURenderPipeline} (asynchronously by default).
 */
export declare class RenderPipelineEntry extends PipelineEntry {
    /** Shaders to use with this {@link RenderPipelineEntry} */
    shaders: PipelineEntryShaders;
    /** {@link RenderMaterialAttributes | Geometry attributes} sent to the {@link RenderPipelineEntry} */
    attributes: RenderMaterialAttributes;
    /** {@link GPURenderPipelineDescriptor | Render pipeline descriptor} based on {@link layout} and {@link shaders} */
    descriptor: GPURenderPipelineDescriptor | null;
    /** Options used to create this {@link RenderPipelineEntry} */
    options: RenderPipelineEntryOptions;
    /**
     * RenderPipelineEntry constructor
     * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters: RenderPipelineEntryParams);
    /**
     * Merge our {@link bindGroups | pipeline entry bind groups} with the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraBindGroup | camera bind group} if needed and set them
     * @param bindGroups - {@link core/materials/RenderMaterial.RenderMaterial#bindGroups | bind groups} to use with this {@link RenderPipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups: AllowedBindGroups[]): void;
    /**
     * Set {@link RenderPipelineEntry} properties (in this case the {@link bindGroups | bind groups} and {@link attributes})
     * @param parameters - the {@link core/materials/RenderMaterial.RenderMaterial#bindGroups | bind groups} and {@link core/materials/RenderMaterial.RenderMaterial#attributes | attributes} to use
     */
    setPipelineEntryProperties(parameters: RenderPipelineEntryPropertiesParams): void;
    /**
     * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders(): void;
    /**
     * Get whether the shaders modules have been created
     * @readonly
     */
    get shadersModulesReady(): boolean;
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders(): void;
    /**
     * Create the render pipeline {@link descriptor}
     */
    createPipelineDescriptor(): void;
    /**
     * Create the render {@link pipeline}
     */
    createRenderPipeline(): void;
    /**
     * Asynchronously create the render {@link pipeline}
     * @async
     * @returns - void promise result
     */
    createRenderPipelineAsync(): Promise<void>;
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
     * @async
     */
    compilePipelineEntry(): Promise<void>;
}
