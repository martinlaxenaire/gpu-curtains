import { BindGroup } from './BindGroup';
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Sampler } from '../samplers/Sampler';
import { BindGroupParams } from '../../types/BindGroups';
import { MaterialTexture } from '../../types/Materials';
import { BufferBinding } from '../bindings/BufferBinding';
/**
 * An object defining all possible {@link TextureBindGroup} class instancing parameters
 */
export interface TextureBindGroupParams extends BindGroupParams {
    /** array of {@link MaterialTexture | textures} to add to a {@link TextureBindGroup} */
    textures?: MaterialTexture[];
    /** array of {@link Sampler} to add to a {@link TextureBindGroup} */
    samplers?: Sampler[];
}
/**
 * Used to regroup all {@link types/BindGroups.BindGroupBindingElement | bindings} related to textures (texture, texture matrices buffers and samplers) into one single specific {@link BindGroup}.
 *
 * Also responsible for uploading video textures if needed.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a texture
 * const texture = new Texture(gpuCurtains, {
 *   label: 'Input texture',
 *   name: 'inputTexture',
 * })
 *
 * // create a texture bind group using that texture
 * const textureBindGroup = new TextureBindGroup(gpuCurtains, {
 *   label: 'My texture bind group',
 *   textures: [texture],
 *   uniforms: {
 *     params: {
 *       struct: {
 *         opacity: {
 *           type: 'f32',
 *           value: 1,
 *         },
 *         mousePosition: {
 *           type: 'vec2f',
 *           value: new Vec2(),
 *         },
 *       },
 *     },
 *   },
 * })
 *
 * // create the GPU buffer, bindGroupLayout and bindGroup
 * textureBindGroup.createBindGroup()
 * ```
 */
export declare class TextureBindGroup extends BindGroup {
    #private;
    /**
     * A {@link BufferBinding} with all the {@link MediaTexture#modelMatrix | MediaTexture modelMatrix} if any.
     */
    texturesMatricesBinding: BufferBinding | null;
    /**
     * TextureBindGroup constructor
     * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
     * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}.
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, uniforms, storages, textures, samplers }?: TextureBindGroupParams);
    /**
     * Adds a texture to the {@link textures} array and {@link bindings}.
     * @param texture - texture to add.
     */
    addTexture(texture: MaterialTexture): void;
    /**
     * Get the current {@link textures} array.
     * @readonly
     */
    get textures(): MaterialTexture[];
    /**
     * Adds a sampler to the {@link samplers} array and {@link bindings}.
     * @param sampler
     */
    addSampler(sampler: Sampler): void;
    /**
     * Get the current {@link samplers} array.
     * @readonly
     */
    get samplers(): Sampler[];
    /**
     * Get whether the GPU bind group is ready to be created.
     * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all {@link GPUTexture} and {@link GPUSampler} are created.
     * @readonly
     */
    get shouldCreateBindGroup(): boolean;
    /**
     * Set the {@link texturesMatricesBinding} if needed.
     */
    setTexturesMatricesBinding(): void;
    /**
     * Create the {@link texturesMatricesBinding} and {@link bindGroup}.
     */
    createBindGroup(): void;
    /**
     * Update the {@link TextureBindGroup#textures | bind group textures}:
     * - Check if they need to copy their source texture.
     * - Upload video texture if needed.
     */
    updateTextures(): void;
    /**
     * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed.
     */
    update(): void;
    /**
     * Destroy our {@link TextureBindGroup}.
     */
    destroy(): void;
}
