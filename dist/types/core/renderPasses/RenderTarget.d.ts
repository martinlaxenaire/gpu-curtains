import { Renderer } from '../renderers/utils';
import { RenderPass, RenderPassParams } from './RenderPass';
import { Texture } from '../textures/Texture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Parameters used to create a {@link RenderTarget}
 */
export interface RenderTargetParams extends RenderPassParams {
    /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
}
/**
 * Used to draw to {@link RenderPass#viewTextures | RenderPass view textures} (and eventually {@link RenderPass#depthTexture | depth texture}) instead of directly to screen.
 *
 * The meshes assigned to a {@link RenderTarget} will be drawn before the other objects in the {@link core/scenes/Scene.Scene | Scene} rendering loop.
 *
 * Can also be assigned as ShaderPass {@link core/renderPasses/ShaderPass.ShaderPass#inputTarget | input} or {@link core/renderPasses/ShaderPass.ShaderPass#outputTarget | output} targets.
 *
 * If the {@link RenderPass} created handle color attachments, then a {@link RenderTarget#renderTexture | Texture} will be created to update and/or resolve the content of the current view. This {@link RenderTarget#renderTexture | Texture} could therefore usually be used to access the current content of this {@link RenderTarget}.
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
 * const outputTarget = new RenderTarget(gpuCurtains, {
 *   label: 'My render target',
 * })
 * ```
 */
export declare class RenderTarget {
    #private;
    /** {@link Renderer} used by this {@link RenderTarget} */
    renderer: Renderer;
    /** The type of the {@link RenderTarget} */
    type: string;
    /** The universal unique id of this {@link RenderTarget} */
    readonly uuid: string;
    /** Options used to create this {@link RenderTarget} */
    options: RenderTargetParams;
    /** {@link RenderPass} used by this {@link RenderTarget} */
    renderPass: RenderPass;
    /** {@link Texture} that will be resolved by the {@link renderPass} when {@link RenderPass#updateView | setting the current texture} */
    renderTexture?: Texture;
    /**
     * RenderTarget constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: RenderTargetParams);
    /**
     * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
     *
     * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
     *
     * @readonly
     */
    get outputTextures(): Texture[];
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene(): void;
    /**
     * Resize our {@link renderPass}
     */
    resize(): void;
    /**
     * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}
     */
    remove(): void;
    /**
     * Destroy our {@link RenderTarget}
     */
    destroy(): void;
}
