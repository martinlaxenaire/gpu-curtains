import { Renderer } from '../renderers/utils';
import { BindGroup } from '../bindGroups/BindGroup';
import { TextureBindGroup } from '../bindGroups/TextureBindGroup';
import { Sampler } from '../samplers/Sampler';
import { AllowedPipelineEntries, GPUPassTypes } from '../pipelines/PipelineManager';
import { BufferBinding, BufferBindingInput } from '../bindings/BufferBinding';
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups';
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Binding } from '../bindings/Binding';
import { BufferElement } from '../bindings/bufferElements/BufferElement';
import { Buffer } from '../buffers/Buffer';
/**
 * Used as a base to create a {@link Material}.
 *
 * The purpose of {@link Material} is to create and update the {@link BindGroup | bind groups} and their bindings (GPU buffers, textures and samplers), create a {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} and use them to {@link Material#render | render}.
 *
 * ## Bind groups
 *
 * A {@link Material} automatically creates a {@link TextureBindGroup}, but it is actually added to the active {@link Material#bindGroups | bind groups array} only if necessary, which means if your shaders use a {@link GPUSampler}, a {@link GPUTexture} or a {@link GPUExternalTexture}.
 *
 * Another {@link BindGroup} will be created if you pass any {@link MaterialParams#uniforms | uniforms} or {@link MaterialParams#storages | storages} parameters.
 *
 * Finally, you can also pass already created {@link BindGroup} to a {@link Material} via the {@link MaterialParams#bindGroups | bindGroups} parameter.
 *
 * ----
 *
 * Note that this class is not intended to be used as is, but as a base for {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} and {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} classes.
 */
export declare class Material {
    /** The type of the {@link Material}. */
    type: string;
    /** The universal unique id of the {@link Material}. */
    readonly uuid: string;
    /** The {@link Renderer} used. */
    renderer: Renderer;
    /** Options used to create this {@link Material}. */
    options: MaterialOptions;
    /** Pipeline entry used by this {@link Material}. */
    pipelineEntry: AllowedPipelineEntries;
    /**
     * Array of {@link BindGroup | bind groups} used by this {@link Material}.
     * This array respects a specific order:
     * 1. The {@link texturesBindGroup | textures bind groups}.
     * 2. The {@link BindGroup | bind group} created using {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters if any.
     * 3. Additional {@link MaterialParams#bindGroups | bind groups} parameters if any.
     */
    bindGroups: AllowedBindGroups[];
    /** Array of {@link TextureBindGroup | texture bind groups} used by this {@link Material}. */
    texturesBindGroups: TextureBindGroup[];
    /** Array of {@link BindGroup | bind groups} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material}. */
    inputsBindGroups: BindGroup[];
    /** Array of {@link BindGroup | cloned bind groups} created by this {@link Material}. */
    clonedBindGroups: AllowedBindGroups[];
    /** Object containing all uniforms inputs handled by this {@link Material}. */
    uniforms: Record<string, Record<string, BufferBindingInput>>;
    /** Object containing all read only or read/write storages inputs handled by this {@link Material}. */
    storages: Record<string, Record<string, BufferBindingInput>>;
    /** Map of {@link Binding | bindings} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material}. */
    inputsBindings: Map<string, BindGroupBindingElement>;
    /** Array of {@link Texture} or {@link MediaTexture} handled by this {@link Material}. */
    textures: MaterialTexture[];
    /** Array of {@link Sampler} handled by this {@link Material}. */
    samplers: Sampler[];
    /**
     * Material constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link Material}.
     * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material.
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams);
    /**
     * Set or reset this {@link Material} {@link Material.renderer | renderer}. Also reset the {@link bindGroups} renderer.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Check if all bind groups are ready, and create them if needed.
     */
    compileMaterial(): Promise<void>;
    /**
     * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled.
     * @readonly
     */
    get ready(): boolean;
    /**
     * Get the {@link Material} pipeline buffers cache key based on its {@link BindGroup} cache keys.
     * @returns - Current cache key.
     * @readonly
     */
    get cacheKey(): string;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to `null`, so they will be reset next time we try to render.
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our samplers, textures and bind groups.
     */
    restoreContext(): void;
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="full"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    getShaderCode(shaderType?: FullShadersType): Promise<string>;
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="vertex"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    getAddedShaderCode(shaderType?: FullShadersType): Promise<string>;
    /**
     * Prepare and set our bind groups based on inputs and bindGroups Material parameters.
     */
    setBindGroups(): void;
    /**
     * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct.
     * @readonly
     */
    get texturesBindGroup(): TextureBindGroup;
    /**
     * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
     * @param bindGroup - The {@link BindGroup} to process.
     */
    processBindGroupBindings(bindGroup: BindGroup): void;
    /**
     * Create the bind groups if they need to be created.
     */
    createBindGroups(): void;
    /**
     * Clones a {@link BindGroup} from a list of buffers.
     * Useful to create a new{@link BindGroup} with already created buffers, but swapped.
     * @param parameters - parameters used to clone the {@link BindGroup}.
     * @param parameters.bindGroup - the {@link BindGroup} to clone.
     * @param parameters.bindings - our input binding buffers.
     * @param parameters.keepLayout - whether we should keep original bind group layout or not.
     * @returns - the cloned {@link BindGroup}.
     */
    cloneBindGroup({ bindGroup, bindings, keepLayout, }: {
        bindGroup?: AllowedBindGroups;
        bindings?: BindGroupBindingElement[];
        keepLayout?: boolean;
    }): AllowedBindGroups | null;
    /**
     * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
     * @param bindingName - the binding name/key to look for.
     * @returns - {@link BindGroup} found or null if not found.
     */
    getBindGroupByBindingName(bindingName?: BufferBinding['name']): AllowedBindGroups | null;
    /**
     * Destroy a {@link BindGroup}, only if it is not used by another object.
     * @param bindGroup - {@link BindGroup} to eventually destroy.
     */
    destroyBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Destroy all {@link BindGroup}.
     */
    destroyBindGroups(): void;
    /**
     * Update all {@link BindGroup}.
     */
    updateBindGroups(): void;
    /**
     * {@link BindGroup#update | Update a BindGroup}:
     * - Update the textures if it's a {@link texturesBindGroups | textures bind group}.
     * - Update its {@link BindGroup#bufferBindings | buffer bindings}.
     * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}.
     * - Check if we need to flush the pipeline.
     * @param bindGroup - {@link BindGroup} to update.
     */
    updateBindGroup(bindGroup: BindGroup): void;
    /**
     * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key.
     * @returns - The found binding, or null if not found.
     */
    getBindingByName(bindingName?: Binding['name']): BindGroupBindingElement | undefined;
    /**
     * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}.
     * @param bindingName - The binding name or key.
     * @returns - The found binding, or null if not found.
     */
    getBufferBindingByName(bindingName?: Binding['name']): BindGroupBufferBindingElement | undefined;
    /**
     * Force setting a given {@link BufferBindingInput | buffer binding} shouldUpdate flag to `true` to update it at next render.
     * @param bufferBindingName - The buffer binding name.
     * @param bindingName - The binding name.
     */
    shouldUpdateInputsBindings(bufferBindingName?: BufferBinding['name'], bindingName?: BufferBindingInput['name']): void;
    /**
     * Prepare our {@link Material.textures | textures} array and set the {@link TextureBindGroup}.
     */
    setTextures(): void;
    /**
     * Add a {@link MediaTexture} or {@link Texture} to our {@link textures} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
     * @param texture - {@link MediaTexture} or {@link Texture} to add.
     */
    addTexture(texture: MaterialTexture): void;
    /**
     * Destroy a {@link MediaTexture} or {@link Texture}, only if it is not used by another object or cached.
     * @param texture - {@link MediaTexture} or {@link Texture} to eventually destroy.
     */
    destroyTexture(texture: MaterialTexture): void;
    /**
     * Destroy all the Material {@link textures}.
     */
    destroyTextures(): void;
    /**
     * Prepare our {@link Material.samplers | samplers} array and always add a default {@link Sampler} if not already passed as parameter.
     */
    setSamplers(): void;
    /**
     * Add a {@link Sampler} to our {@link samplers} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
     * @param sampler - {@link Sampler} to add.
     */
    addSampler(sampler: Sampler): void;
    /**
     * Map a {@link Buffer#GPUBuffer | Buffer's GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param buffer - {@link Buffer} to use for mapping.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    getBufferResult(buffer: Buffer): Promise<Float32Array>;
    /**
     * Map the content of a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
     * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    getBufferBindingResultByBindingName(bindingName?: Binding['name']): Promise<Float32Array>;
    /**
     * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
     * @param parameters - Parameters used to get the result.
     * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
     * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards.
     * @returns - {@link Float32Array} holding {@link GPUBuffer} data.
     */
    getBufferElementResultByNames({ bindingName, bufferElementName, }: {
        bindingName: Binding['name'];
        bufferElementName: BufferElement['name'];
    }): Promise<Float32Array>;
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline.
     * Finally, updates all the {@link bindGroups | bind groups}.
     */
    onBeforeRender(): void;
    /**
     * Set the current pipeline.
     * @param pass - Current pass encoder.
     */
    setPipeline(pass: GPUPassTypes): void;
    /**
     * Use the {@link Renderer#pipelineManager | renderer pipelineManager} to only set the bind groups that are not already set.
     * @param pass - Current pass encoder.
     */
    setActiveBindGroups(pass: GPUPassTypes): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups.
     * @param pass - Current pass encoder.
     */
    render(pass: GPUPassTypes): void;
    /**
     * Destroy the Material.
     */
    destroy(): void;
}
