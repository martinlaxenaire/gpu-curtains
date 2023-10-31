import { BindGroup } from './BindGroup';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Sampler } from '../samplers/Sampler';
import { BindGroupParams } from '../../types/BindGroups';
import { MaterialTexture } from '../../types/Materials';
/**
 * An object defining all possible {@link TextureBindGroup} instancing parameters
 * @typedef {TextureBindGroupParams}
 * @extends BindGroupParams
 * @property {MaterialTexture[]} [textures=[]] - array of [textures]{@link MaterialTexture} to add to a {@link TextureBindGroup}
 * @property {Sampler[]} [samplers=[]] - array of {@link Sampler} to add to a {@link TextureBindGroup}
 */
export interface TextureBindGroupParams extends BindGroupParams {
    textures?: MaterialTexture[];
    samplers?: Sampler[];
}
/**
 * TextureBindGroup class:
 * Used to regroup all bindings related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 */
export declare class TextureBindGroup extends BindGroup {
    /**
     * An array containing all the already created external textures ID
     * @type {number[]}
     */
    externalTexturesIDs: number[];
    /**
     * TextureBindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {TextureBindGroupParams=} parameters - parameters used to create our texture bind group
     * @param {string=} parameters.label - bind group label
     * @param {number=} parameters.index - bind group index (used to generate shader code)
     * @param {BindGroupBindingElement[]=} parameters.bindings - array of already created bindings (buffers, texture, etc.)
     * @param {BindGroupInputs} parameters.inputs - inputs that will be used to create additional bindings
     * @param {MaterialTexture[]=} parameters.textures - array of textures to add to this texture bind group
     * @param {Sampler[]=} parameters.samplers - array of samplers to add to this texture bind group
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, inputs, textures, samplers }?: TextureBindGroupParams);
    /**
     * Adds a texture to the textures array and the bindings
     * @param {MaterialTexture} texture - texture to add
     */
    addTexture(texture: MaterialTexture): void;
    /**
     * Get the current textures array
     * @readonly
     * @type {MaterialTexture[]}
     */
    get textures(): MaterialTexture[];
    /**
     * Adds a sampler to the samplers array and the bindings
     * @param {Sampler} sampler
     */
    addSampler(sampler: Sampler): void;
    /**
     * Get the current samplers array
     * @readonly
     * @type {Sampler[]}
     */
    get samplers(): Sampler[];
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
     * @readonly
     * @type {boolean}
     */
    get shouldCreateBindGroup(): boolean;
    /**
     * Creates {@link BindGroup#bindings} for buffers, textures and samplers
     */
    createBindingsBuffers(): void;
    /**
     * Reset our {@link TextureBindGroup}, first by reassigning correct {@link BindGroup#entries} resources, then by recreating the GPUBindGroup.
     * Called each time a GPUTexture or GPUExternalTexture has changed:
     * - A texture media has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
     * - GPUExternalTexture at each tick
     * - A render texture GPUTexture has changed (on resize)
     */
    resetTextureBindGroup(): void;
    /**
     * Get whether we should update our video {@link TextureBindGroup}.
     * Happens when a GPUExternalTexture is created, we need to rebuild the {@link BindGroup#bindGroup} and {@link BindGroup#bindGroupLayout} from scratch. We might even need to recreate the whole pipeline (it it has already been created).
     * @param {number} textureIndex - the texture index in the bind group textures array
     * @returns {boolean}
     */
    shouldUpdateVideoTextureBindGroupLayout(textureIndex: number): boolean;
    /**
     * Called if the result of {@link shouldUpdateVideoTextureBindGroupLayout} is true. Updates our {@link BindGroup#bindGroupLayout} {@link BindGroup#entries} on the fly, then recreates GPUBindGroupLayout.
     * Will also call {@link resetTextureBindGroup} afterwhile to recreate the GPUBindGroup.
     * @param {number} textureIndex - the texture index in the bind group textures array
     */
    updateVideoTextureBindGroupLayout(textureIndex: number): void;
    /**
     * Destroy our {@link TextureBindGroup}
     */
    destroy(): void;
}
