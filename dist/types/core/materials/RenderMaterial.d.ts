import { Material } from './Material';
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { AllowedGeometries, RenderMaterialAttributes, RenderMaterialOptions, RenderMaterialParams } from '../../types/Materials';
import { RenderPipelineEntry } from '../pipelines/RenderPipelineEntry';
/**
 * Create a {@link Material} specifically built to draw vertices. Internally used by all kind of Meshes.
 */
export declare class RenderMaterial extends Material {
    /** {@link RenderPipelineEntry | Render pipeline entry} used by this {@link RenderMaterial} */
    pipelineEntry: RenderPipelineEntry;
    /** Mandatory {@link RenderMaterialAttributes | geometry attributes} to pass to the {@link RenderPipelineEntry | render pipeline entry} */
    attributes: RenderMaterialAttributes | null;
    /** Options used to create this {@link RenderMaterial} */
    options: RenderMaterialOptions;
    /**
     * RenderMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams);
    /**
     * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry}
     */
    setPipelineEntryProperties(): void;
    /**
     * Compile the {@link RenderPipelineEntry}
     * @async
     */
    compilePipelineEntry(): Promise<void>;
    /**
     * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers and compile the pipeline
     * @async
     */
    compileMaterial(): Promise<void>;
    /**
     * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
     * @param geometry - the geometry to draw
     */
    setAttributesFromGeometry(geometry: AllowedGeometries): void;
    /**
     * Create the bind groups if they need to be created, but first add Camera bind group if needed
     */
    createBindGroups(): void;
}
