import { Renderer } from '../renderers/utils';
import { RenderPass, RenderPassParams } from './RenderPass';
import { RenderTexture } from '../textures/RenderTexture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
/**
 * Parameters used to create a {@link RenderTarget}
 */
export interface RenderTargetParams extends RenderPassParams {
    /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
}
/**
 * Used to draw meshes to a {@link RenderPass#viewTexture | RenderPass view texture} instead of directly to screen.
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
 * const renderTarget = new RenderTarget(gpuCurtains, {
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
    /** {@link RenderTexture} that will be resolved by the {@link renderPass} when {@link core/renderers/GPURenderer.GPURenderer#setRenderPassCurrentTexture | setting the current texture} */
    renderTexture: RenderTexture;
    /**
     * RenderTarget constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams);
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene(): void;
    /**
     * Resize our {@link renderPass} and {@link renderTexture}
     * @param boundingRect - new {@link DOMElementBoundingRect | bounding rectangle}
     */
    resize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}
     */
    remove(): void;
    /**
     * Destroy our {@link RenderTarget}
     */
    destroy(): void;
}
