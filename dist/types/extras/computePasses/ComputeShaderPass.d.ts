import { ComputePass, ComputePassOptions, ComputePassParams } from '../../core/computePasses/ComputePass';
import { Renderer } from '../../core/renderers/utils';
import { ShaderPass, ShaderPassParams } from '../../core/renderPasses/ShaderPass';
import { Sampler } from '../../core/samplers/Sampler';
import { Texture } from '../../core/textures/Texture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/** Define the specific additional options to use with a {@link ComputeShaderPass}. */
export interface ComputeShaderPassSpecificOptions {
    /** Workgroup size of the compute shader to use. Divided internally by the storage texture `[width, height]`. Default to `[16, 16]`. */
    textureDispatchSize: number | number[];
    /** Name of the {@link Texture | storage texture} used in the compute shader. */
    storageRenderTextureName: string;
    /** Optional {@link Sampler} to use in the {@link ShaderPass} to sample the result. */
    shaderPassSampler: Sampler;
}
/** Define the parameters used to create a {@link ComputeShaderPass}. */
export interface ComputeShaderPassParams extends Omit<ComputePassParams, 'dispatchSize' | 'autoRender' | 'renderOrder' | 'active'>, Omit<ShaderPassParams, 'label' | 'textures' | 'shaders' | 'samplers' | 'texturesOptions'>, Partial<ComputeShaderPassSpecificOptions> {
}
/** Define the {@link ComputeShaderPass} options */
export interface ComputeShaderPassOptions extends ComputePassOptions, ComputeShaderPassSpecificOptions {
}
/**
 * A special class used to leverage {@link ComputePass} shaders and {@link ShaderPass} for post processing effects.
 *
 * Allows to write post processing effects to a storage texture using a compute shader, which can be faster than regular {@link ShaderPass} in some cases.
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
 * const computeShaderPass = new ComputeShaderPass(gpuCurtains, {
 *   label: 'My compute shader pass',
 *   shaders: {
 *     compute: {
 *       code: computeShaderPassCode, // assume it is a valid WGSL compute shader
 *     },
 *   },
 *   textureDispatchSize: [16, 16], // divided by the render texture [width, height] internally
 * })
 * ```
 */
export declare class ComputeShaderPass extends ComputePass {
    /** Associated {@link ShaderPass} that just displays the result of the {@link ComputeShaderPass} compute shader. */
    shaderPass: ShaderPass;
    /** {@link Texture | Storage texture} to write onto by the {@link ComputeShaderPass} compute shader. */
    storageTexture: Texture;
    /** The same texture as {@link storageTexture} but with a different binding type, used to render the result in the {@link shaderPass}. */
    renderTexture: Texture;
    /** Workgroup size of the compute shader. Divided internally by the {@link storageTexture} `[width, height]`. */
    textureDispatchSize: number[];
    /** Options used to create this {@link ComputeShaderPass}. */
    options: ComputeShaderPassOptions;
    /**
     * ComputeShaderPass constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeShaderPass}.
     * @param parameters - {@link ComputeShaderPassParams | parameters} used to create our {@link ComputeShaderPass}.
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: ComputeShaderPassParams);
    /**
     * Get whether the {@link ComputePass} and {@link ShaderPass} should run.
     */
    get visible(): boolean;
    /**
     * Set whether the {@link ComputePass} and {@link ShaderPass} should run.
     */
    set visible(value: boolean);
    /**
     * Update the dispatch size and resize.
     */
    resize(): void;
    /**
     * Destroy the {@link ComputeShaderPass}.
     */
    destroy(): void;
}
