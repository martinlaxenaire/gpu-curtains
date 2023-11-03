/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { BindGroup } from '../bindGroups/BindGroup';
import { TextureBindGroup } from '../bindGroups/TextureBindGroup';
import { Sampler } from '../samplers/Sampler';
import { AllowedPipelineEntries } from '../pipelines/PipelineManager';
import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings';
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups';
import { Texture } from '../textures/Texture';
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTexture } from '../textures/RenderTexture';
/**
 * Material class:
 * Used as a base to create a material.
 * The goal of material is to create and update the bind groups (including textures and samplers), create a pipeline and use them to render.
 */
export declare class Material {
    type: string;
    renderer: Renderer;
    options: MaterialOptions;
    pipelineEntry: AllowedPipelineEntries;
    bindGroups: AllowedBindGroups[];
    clonedBindGroups: AllowedBindGroups[];
    uniforms: Record<string, Record<string, BufferBindingsUniform>>;
    storages: Record<string, Record<string, BufferBindingsUniform>>;
    works: Record<string, Record<string, BufferBindingsUniform>>;
    inputsBindGroups: BindGroup[];
    inputsBindings: BindGroupBindingElement[];
    textures: MaterialTexture[];
    samplers: Sampler[];
    texturesBindGroup: TextureBindGroup;
    /**
     * Material constructor
     * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
     * @param {MaterialParams} parameters - parameters used to create our Material
     * @param {string} parameters.label - Material label
     * @param {boolean} parameters.useAsyncPipeline - whether the pipeline should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our Material shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our Material {@see BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams);
    /**
     * Check if all bind groups are ready, and create them if needed
     */
    setMaterial(): void;
    /**
     * Get whether our pipeline entry and pipeline have been created and successfully compiled
     * @readonly
     * @type {boolean}
     */
    get ready(): boolean;
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
     * @param {FullShadersType} [shaderType="full"] - shader to get the code from
     * @returns {string} - The corresponding shader code
     */
    getShaderCode(shaderType?: FullShadersType): string;
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
     * @param {FullShadersType} [shaderType="full"] - shader to get the code from
     * @returns {string} - The corresponding shader code
     */
    getAddedShaderCode(shaderType?: FullShadersType): string;
    /** BIND GROUPS **/
    /**
     * Prepare and set our bind groups based on inputs and bindGroups Material parameters
     */
    setBindGroups(): void;
    /**
     * Process all {@see BindGroup} bindings and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to bindings.
     * @param {BindGroup} bindGroup
     */
    processBindGroupBindings(bindGroup: BindGroup): void;
    /**
     * Create the bind groups if they need to be created
     */
    createBindGroups(): void;
    /**
     * Clones a {@see BindGroup} from a list of buffers
     * Useful to create a new bind group with already created buffers, but swapped
     * @param {BindGroup} bindGroup - the BindGroup to clone
     * @param {BindGroupBufferBindingElement[]} bindings - our input binding buffers
     * @param {boolean} keepLayout - whether we should keep original bind group layout or not
     * @returns {AllowedBindGroups} - the cloned BindGroup
     */
    cloneBindGroup({ bindGroup, bindings, keepLayout, }: {
        bindGroup?: BindGroup;
        bindings?: BindGroupBufferBindingElement[];
        keepLayout?: boolean;
    }): BindGroup | null;
    /**
     * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
     * @param {BufferBindings['name']=} bindingName - the binding name/key to look for
     * @returns {?AllowedBindGroups} - bind group found or null if not found
     */
    getBindGroupByBindingName(bindingName?: BufferBindings['name']): AllowedBindGroups | null;
    /**
     * Destroy all bind groups
     */
    destroyBindGroups(): void;
    /**
     * Update all bind groups.
     * For each of them, first check if it eventually needs a reset, then update its bindings
     */
    updateBindGroups(): void;
    /** INPUTS **/
    /**
     * Force a given buffer binding update flag to update it at next render
     * @param {BufferBindings['name']=} bufferBindingName - the buffer binding name
     * @param {BufferBindingsUniform['name']=} bindingName - the binding name
     */
    shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], bindingName?: BufferBindingsUniform['name']): void;
    /**
     * Look for a binding by name/key in all bind groups
     * @param {string} bindingName - the binding name or key
     * @returns {BindGroupBindingElement | null} - the found binding, or null if not found
     */
    getBindingsByName(bindingName?: BufferBindings['name']): BindGroupBindingElement | null;
    /**
     * Look for a binding buffer by name/key in all bind groups
     * @param {string} bindingName - the binding name or key
     * @returns {BindGroupBindingBuffer[]} - the found binding buffers, or an empty array if not found
     */
    /** SAMPLERS & TEXTURES **/
    /**
     * Prepare our textures array and set the {@see TextureBindGroup}
     */
    setTextures(): void;
    /**
     * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param {Texture | RenderTexture} texture - texture to add
     */
    addTexture(texture: Texture | RenderTexture): void;
    /**
     * Destroy all the Material textures
     */
    destroyTextures(): void;
    /**
     * Prepare our samplers array and always add a default sampler if not already passed as parameter
     */
    setSamplers(): void;
    /**
     * Add a sampler to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param {Sampler} sampler - sampler to add
     */
    addSampler(sampler: Sampler): void;
    /** Render loop **/
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline
     * Then render the textures and updates them
     * Finally updates all buffer inputs that need it and update the bind groups (write buffers if needed)
     */
    onBeforeRender(): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups
     * @param {GPURenderPassEncoder | GPUComputePassEncoder} pass
     */
    render(pass: GPURenderPassEncoder | GPUComputePassEncoder): void;
    /**
     * Destroy the Material
     */
    destroy(): void;
}
