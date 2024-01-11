import { FullscreenPlane } from '../meshes/FullscreenPlane';
import { Renderer } from '../renderers/utils';
import { RenderTarget } from './RenderTarget';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { MeshBaseRenderParams } from '../meshes/mixins/MeshBaseMixin';
import { RenderTexture } from '../textures/RenderTexture';
/**
 * Parameters used to create a {@link ShaderPass}
 */
export interface ShaderPassParams extends MeshBaseRenderParams {
    /** Optional {@link RenderTarget} to assign to the {@link ShaderPass} */
    renderTarget?: RenderTarget;
}
/**
 * Used to apply postprocessing, i.e. draw meshes to a {@link RenderTexture} and then draw a {@link FullscreenPlane} using that texture as an input.
 *
 * A ShaderPass could either post process the whole scene or just a bunch of meshes using a specific {@link RenderTarget}.
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
 * // create a ShaderPass
 * const shaderPass = new ShaderPass(gpuCurtain, {
 *   label: 'My shader pass',
 *   shaders: {
 *     fragment: {
 *       code: shaderPassCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export declare class ShaderPass extends FullscreenPlane {
    /** {@link RenderTarget} content to use as an input if specified */
    renderTarget: RenderTarget | undefined;
    /**
     * ShaderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams);
    /**
     * Get our main {@link RenderTexture}, the one that contains our post processed content
     * @readonly
     */
    get renderTexture(): RenderTexture | undefined;
    /**
     * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
     * @param renderTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
     */
    setRenderTarget(renderTarget: RenderTarget | null): void;
    /**
     * Add the {@link ShaderPass} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link ShaderPass} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene(): void;
}
