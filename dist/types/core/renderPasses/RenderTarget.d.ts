import { Renderer } from '../renderers/utils';
import { RenderPass, RenderPassParams } from './RenderPass';
import { RenderTexture } from '../textures/RenderTexture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
/**
 * Parameters used to create a {@link RenderTarget}
 */
export interface RenderTargetParams extends RenderPassParams {
    /** Whether we should add this {@link RenderTarget} to our {@link Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
}
/**
 * RenderTarget class:
 * Used to render meshes to a [render pass]{@link RenderPass} [render texture]{@link RenderTexture} instead of directly to screen
 */
export declare class RenderTarget {
    #private;
    /** [renderer]{@link Renderer} used by this {@link RenderTarget} */
    renderer: Renderer;
    /** The type of the {@link RenderTarget} */
    type: string;
    /** The universal unique id of this {@link RenderTarget} */
    readonly uuid: string;
    /** Options used to create this {@link RenderTarget} */
    options: RenderTargetParams;
    /** {@link RenderPass} used by this {@link RenderTarget} */
    renderPass: RenderPass;
    /** {@link RenderTexture} that will be resolved by the {@link RenderTarget#renderPass} when [setting the current texture]{@link GPURenderer#setRenderPassCurrentTexture} */
    renderTexture: RenderTexture;
    /**
     * RenderTarget constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - [parameters]{@link RenderTargetParams} use to create this {@link RenderTarget}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams);
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link Scene}
     */
    removeFromScene(): void;
    /**
     * Resize our [render pass]{@link RenderTarget#renderPass} and [render texture]{@link RenderTarget#renderTexture}
     * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
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
