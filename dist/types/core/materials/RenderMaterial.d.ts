/// <reference types="dist" />
import { Material } from './Material';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { AllowedGeometries, RenderMaterialAttributes, RenderMaterialParams } from '../../types/Materials';
/**
 * RenderMaterial class:
 * Create a Material specifically built to draw vertices
 * @extends Material
 */
export declare class RenderMaterial extends Material {
    attributes: RenderMaterialAttributes | null;
    /**
     * RenderMaterial constructor
     * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
     * @param {MaterialParams} parameters - parameters used to create our Material
     * @param {string} parameters.label - RenderMaterial label
     * @param {AllowedGeometries} parameters.geometry - geometry to draw
     * @param {boolean} parameters.useAsyncPipeline - whether the {@see RenderPipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our RenderMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our RenderMaterial {@see BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
     * @param {RenderMaterialRenderingOptions} parameters.rendering - RenderMaterial rendering options to pass to the {@see RenderPipelineEntry}
     * @param {boolean} parameters.rendering.useProjection - whether to use the Camera bind group with this material
     * @param {boolean} parameters.rendering.transparent - impacts the {@see RenderPipelineEntry} blend properties
     * @param {boolean} parameters.rendering.depthWriteEnabled - whether to write to the depth buffer or not
     * @param {GPUCompareFunction} parameters.rendering.depthCompare - depth compare function to use
     * @param {GPUCullMode} parameters.rendering.cullMode - cull mode to use
     * @param {Geometry["verticesOrder"]} parameters.rendering.verticesOrder - vertices order to use
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams);
    /**
     * When all bind groups and attributes are created, add them to the {@see ComputePipelineEntry} and compile it
     */
    setPipelineEntryBuffers(): void;
    /**
     * Create the attributes buffers, check if all bind groups are ready, create them if needed and set {@see RenderPipelineEntry} bind group buffers
     */
    setMaterial(): void;
    /** ATTRIBUTES **/
    /**
     * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
     * @param {AllowedGeometries} geometry - the geometry to draw
     */
    setAttributesFromGeometry(geometry: AllowedGeometries): void;
    /**
     * Create and write attribute buffers
     */
    createAttributesBuffers(): void;
    /**
     * Destroy the attribute buffers
     */
    destroyAttributeBuffers(): void;
    /** BIND GROUPS **/
    /**
     * Create the bind groups if they need to be created, but first add Camera bind group if needed
     */
    createBindGroups(): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups, set the vertex buffers and then draw!
     * @param {GPURenderPassEncoder} pass
     */
    render(pass: GPURenderPassEncoder): void;
    /**
     * Destroy the RenderMaterial
     */
    destroy(): void;
}
