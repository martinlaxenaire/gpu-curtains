import { Material } from './Material';
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { AllowedGeometries, RenderMaterialAttributes, RenderMaterialOptions, RenderMaterialParams, RenderMaterialRenderingOptions } from '../../types/Materials';
import { RenderPipelineEntry } from '../pipelines/RenderPipelineEntry';
/**
 * Create a {@link Material} specifically built to draw the vertices of a {@link core/geometries/Geometry.Geometry | Geometry}. Internally used by all kind of Meshes.
 *
 * ## Render pipeline
 *
 * A {@link RenderMaterial} automatically creates a {@link RenderPipelineEntry}. Once all the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} have been created, they are sent with the shaders code and the {@link RenderMaterialOptions#rendering | rendering options} to the {@link RenderPipelineEntry}, which is in turns responsible for creating the {@link GPURenderPipeline}.
 *
 * After the {@link GPURenderPipeline} has been successfully compiled, the {@link RenderMaterial} is considered to be ready.
 */
export declare class RenderMaterial extends Material {
    /** {@link RenderPipelineEntry | Render pipeline entry} used by this {@link RenderMaterial} */
    pipelineEntry: RenderPipelineEntry | null;
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
     * Set or reset this {@link RenderMaterial} {@link RenderMaterial.renderer | renderer}. Will also update the renderer camera bind group if needed.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
     */
    setPipelineEntry(): void;
    /**
     * Compile the {@link RenderPipelineEntry}
     */
    compilePipelineEntry(): Promise<void>;
    /**
     * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
     */
    compileMaterial(): Promise<void>;
    /**
     * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
     * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
     */
    setRenderingOptions(renderingOptions?: Partial<RenderMaterialRenderingOptions>): void;
    /**
     * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
     * @param geometry - the geometry to draw
     */
    setAttributesFromGeometry(geometry: AllowedGeometries): void;
    /**
     * Get the {@link RenderMaterial} pipeline buffers cache key based on its {@link core/bindGroups/BindGroup.BindGroup | BindGroup} cache keys and eventually {@link attributes} cache keys.
     * @returns - Current cache key.
     * @readonly
     */
    get cacheKey(): string;
    /**
     * Get whether this {@link RenderMaterial} uses the renderer camera and lights bind group.
     * @readonly
     * */
    get useCameraBindGroup(): boolean;
    /**
     * Create the bind groups if they need to be created, but first add camera and lights bind group if needed.
     */
    createBindGroups(): void;
    /**
     * Update all bind groups, except for the camera and light bind groups if present, as it is already updated by the renderer itself.
     */
    updateBindGroups(): void;
}
