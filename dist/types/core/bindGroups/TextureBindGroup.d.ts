import { BindGroup } from './BindGroup';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Sampler } from '../samplers/Sampler';
import { BindGroupParams } from '../../types/BindGroups';
import { MaterialTexture } from '../../types/Materials';
/**
 * An object defining all possible {@link TextureBindGroup} class instancing parameters
 */
export interface TextureBindGroupParams extends BindGroupParams {
    /** array of [textures]{@link MaterialTexture} to add to a {@link TextureBindGroup} */
    textures?: MaterialTexture[];
    /** array of {@link Sampler} to add to a {@link TextureBindGroup} */
    samplers?: Sampler[];
}
/**
 * TextureBindGroup class:
 * Used to regroup all [bindings]{@link BindGroupBindingElement} related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 */
export declare class TextureBindGroup extends BindGroup {
    /** An array containing all the already created external textures ID */
    externalTexturesIDs: number[];
    /**
     * TextureBindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {TextureBindGroupParams=} parameters - [parameters]{@link TextureBindGroupParams} used to create our {@link TextureBindGroup}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, inputs, textures, samplers }?: TextureBindGroupParams);
    /**
     * Adds a texture to the textures array and the bindings
     * @param texture - texture to add
     */
    addTexture(texture: MaterialTexture): void;
    /**
     * Get the current textures array
     * @readonly
     */
    get textures(): MaterialTexture[];
    /**
     * Adds a sampler to the samplers array and the bindings
     * @param sampler
     */
    addSampler(sampler: Sampler): void;
    /**
     * Get the current samplers array
     * @readonly
     */
    get samplers(): Sampler[];
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
     * @readonly
     */
    get shouldCreateBindGroup(): boolean;
    /**
     * Reset our {@link TextureBindGroup}, first by reassigning correct {@link BindGroup#entries} resources, then by recreating the GPUBindGroup.
     * Called each time a GPUTexture or GPUExternalTexture has changed:
     * - A texture media has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
     * - GPUExternalTexture at each tick
     * - A render texture GPUTexture has changed (on resize)
     */
    resetTextureBindGroup(): void;
    /**
     * Get whether we should update our video [bind group layout]{@link GPUBindGroupLayout}.
     * Happens when a GPUExternalTexture is created, we need to rebuild the {@link BindGroup#bindGroup} and {@link BindGroup#bindGroupLayout} from scratch. We might even need to recreate the whole pipeline (it it has already been created).
     * @param textureIndex - the texture index in the bind group textures array
     * @returns - whether we should update the [bind group layout]{@link GPUBindGroupLayout}
     */
    shouldUpdateVideoTextureBindGroupLayout(textureIndex: number): boolean;
    /**
     * Called if the result of {@link shouldUpdateVideoTextureBindGroupLayout} is true. Updates our {@link BindGroup#bindGroupLayout} {@link BindGroup#entries} on the fly, then recreates GPUBindGroupLayout.
     * Will also call {@link resetTextureBindGroup} afterwhile to recreate the GPUBindGroup.
     * @param textureIndex - the texture index in the bind group textures array
     */
    updateVideoTextureBindGroupLayout(textureIndex: number): void;
    /**
     * Destroy our {@link TextureBindGroup}
     */
    destroy(): void;
}
