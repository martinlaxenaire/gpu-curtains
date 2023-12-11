/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { BindGroup } from '../bindGroups/BindGroup';
import { TextureBindGroup } from '../bindGroups/TextureBindGroup';
import { Sampler } from '../samplers/Sampler';
import { AllowedPipelineEntries } from '../pipelines/PipelineManager';
import { BufferBinding, BufferBindingInput } from '../bindings/BufferBinding';
import { AllowedBindGroups, BindGroupBindingElement } from '../../types/BindGroups';
import { Texture } from '../textures/Texture';
import { FullShadersType, MaterialOptions, MaterialParams } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTexture } from '../textures/RenderTexture';
import { Binding } from '../bindings/Binding';
/**
 * Material class:
 * Used as a base to create a material.
 * The goal of material is to create and update the bind groups (including textures and samplers), create a pipeline and use them to render.
 */
export declare class Material {
    /** The type of the {@link Material} */
    type: string;
    /** The universal unique id of the {@link Material} */
    uuid: string;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Options used to create this {@link Material} */
    options: MaterialOptions;
    /** Pipeline entry used by this {@link Material} */
    pipelineEntry: AllowedPipelineEntries;
    /**
     * Array of [bind groups]{@link BindGroup} used by this {@link Material}
     * This array respects a specific order:
     * 1. The [main texture bind group]{@link Material#texturesBindGroup}
     * 2. The [bind group]{@link BindGroup} created using [inputs parameters]{@link MaterialParams#inputs} if any
     * 3. Additional [bind groups parameters]{@link MaterialParams#bindGroups} if any
     */
    bindGroups: AllowedBindGroups[];
    /** Array of [texture bind groups]{@link BindGroup} used by this {@link Material} */
    texturesBindGroups: TextureBindGroup[];
    /** Array of [bind groups]{@link BindGroup} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
    inputsBindGroups: BindGroup[];
    /** Array of [cloned bind groups]{@link BindGroup} created by this {@link Material} */
    clonedBindGroups: AllowedBindGroups[];
    /** Object containing all uniforms inputs handled by this {@link Material} */
    uniforms: Record<string, Record<string, BufferBindingInput>>;
    /** Object containing all read only or read/write storages inputs handled by this {@link Material} */
    storages: Record<string, Record<string, BufferBindingInput>>;
    /** Array of [bindings]{@link Binding} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
    inputsBindings: BindGroupBindingElement[];
    /** Array of [textures]{@link Texture} handled by this {@link Material} */
    textures: Texture[];
    /** Array of [render textures]{@link RenderTexture} handled by this {@link Material} */
    renderTextures: RenderTexture[];
    /** Array of [samplers]{@link Sampler} handled by this {@link Material} */
    samplers: Sampler[];
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
    compileMaterial(): void;
    /**
     * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled
     * @readonly
     */
    get ready(): boolean;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
     */
    loseContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been restored to recreate our bind groups.
     */
    restoreContext(): void;
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="full"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getShaderCode(shaderType?: FullShadersType): string;
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="vertex"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getAddedShaderCode(shaderType?: FullShadersType): string;
    /**
     * Prepare and set our bind groups based on inputs and bindGroups Material parameters
     */
    setBindGroups(): void;
    /**
     * Get the main [texture bind group]{@link TextureBindGroup} created by this {@link Material} to manage all textures related bindings
     * @readonly
     */
    get texturesBindGroup(): TextureBindGroup;
    /**
     * Process all {@see BindGroup} bindings and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to bindings.
     * @param bindGroup - The {@see BindGroup} to process
     */
    processBindGroupBindings(bindGroup: BindGroup): void;
    /**
     * Create the bind groups if they need to be created
     */
    createBindGroups(): void;
    /**
     * Clones a {@see BindGroup} from a list of buffers
     * Useful to create a new bind group with already created buffers, but swapped
     * @param bindGroup - the BindGroup to clone
     * @param bindings - our input binding buffers
     * @param keepLayout - whether we should keep original bind group layout or not
     * @returns - the cloned BindGroup
     */
    cloneBindGroup({ bindGroup, bindings, keepLayout, }: {
        bindGroup?: AllowedBindGroups;
        bindings?: BindGroupBindingElement[];
        keepLayout?: boolean;
    }): AllowedBindGroups | null;
    /**
     * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
     * @param bindingName - the binding name/key to look for
     * @returns - bind group found or null if not found
     */
    getBindGroupByBindingName(bindingName?: BufferBinding['name']): AllowedBindGroups | null;
    /**
     * Destroy a bind group, only if it is not used by another object
     * @param bindGroup - bind group to eventually destroy
     */
    destroyBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Destroy all bind groups
     */
    destroyBindGroups(): void;
    /**
     * [Update]{@link BindGroup#update} all bind groups:
     * - Update all [textures bind groups]{@link Material#texturesBindGroups} textures
     * - Update its [buffer bindings]{@link BindGroup#bufferBindings}
     * - Check if it eventually needs a [reset]{@link BindGroup#resetBindGroup}
     * - Check if we need to flush the pipeline
     */
    updateBindGroups(): void;
    /**
     * Look for a binding by name/key in all bind groups
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName?: Binding['name']): BindGroupBindingElement | undefined;
    /**
     * Force a given buffer binding update flag to update it at next render
     * @param bufferBindingName - the buffer binding name
     * @param bindingName - the binding name
     */
    shouldUpdateInputsBindings(bufferBindingName?: BufferBinding['name'], bindingName?: BufferBindingInput['name']): void;
    /**
     * Prepare our textures array and set the {@see TextureBindGroup}
     */
    setTextures(): void;
    /**
     * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param texture - texture to add
     */
    addTexture(texture: Texture | RenderTexture): void;
    /**
     * Destroy a [texture]{@link Texture} or [render texture]{@link RenderTexture}, only if it is not used by another object
     * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to eventually destroy
     */
    destroyTexture(texture: Texture | RenderTexture): void;
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
     * @param sampler - sampler to add
     */
    addSampler(sampler: Sampler): void;
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline
     * Then render the [textures]{@link Material#textures}
     * Finally updates all the [bind groups]{@link Material#bindGroups}
     */
    onBeforeRender(): void;
    /**
     * Set the current pipeline
     * @param pass - current pass encoder
     */
    setPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups
     * @param pass - current pass encoder
     */
    render(pass: GPURenderPassEncoder | GPUComputePassEncoder): void;
    /**
     * Destroy the Material
     */
    destroy(): void;
}
