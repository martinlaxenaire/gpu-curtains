import { Material } from './Material';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { AllowedGeometries, RenderMaterialAttributes, RenderMaterialParams } from '../../types/Materials';
import { RenderPipelineEntry } from '../pipelines/RenderPipelineEntry';
/**
 * RenderMaterial class:
 * Create a Material specifically built to draw vertices
 * @extends Material
 */
export declare class RenderMaterial extends Material {
    /** [Render pipeline entry]{@link RenderPipelineEntry} used by this {@link RenderMaterial} */
    pipelineEntry: RenderPipelineEntry;
    /** Mandatory [geometry attributes]{@link RenderMaterialAttributes} to pass to the [render pipeline entry]{@link RenderPipelineEntry} */
    attributes: RenderMaterialAttributes | null;
    /**
     * RenderMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - parameters used to create our Material
     * @param {string} parameters.label - RenderMaterial label
     * @param {AllowedGeometries} parameters.geometry - geometry to draw
     * @param {boolean} parameters.useAsyncPipeline - whether the {@link RenderPipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our RenderMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our RenderMaterial {@link BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@link BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@link Sampler}
     * @param {RenderMaterialRenderingOptions} parameters.rendering - RenderMaterial rendering options to pass to the {@link RenderPipelineEntry}
     * @param {boolean} parameters.rendering.useProjection - whether to use the Camera bind group with this material
     * @param {boolean} parameters.rendering.transparent - impacts the {@link RenderPipelineEntry} blend properties
     * @param {boolean} parameters.rendering.depthWriteEnabled - whether to write to the depth buffer or not
     * @param {GPUCompareFunction} parameters.rendering.depthCompare - depth compare function to use
     * @param {GPUCullMode} parameters.rendering.cullMode - cull mode to use
     * @param {Geometry['verticesOrder']} parameters.rendering.verticesOrder - vertices order to use
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams);
    /**
     * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry} and compile it
     */
    setPipelineEntryProperties(): void;
    /**
     * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers
     */
    setMaterial(): void;
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
