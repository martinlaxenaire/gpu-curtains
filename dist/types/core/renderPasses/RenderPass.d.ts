/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMElementBoundingRect, RectSize } from '../DOM/DOMElement';
/**
 * Options used to create this {@link RenderPass}
 */
export interface RenderPassOptions {
    /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
    label: string;
    /** Whether this {@link RenderPass} should handle a depth texture */
    depth: boolean;
    /** The [load operation]{@link GPULoadOp} to perform while drawing this {@link RenderPass} */
    loadOp: GPULoadOp;
    /** The [color values]{@link GPUColor} to clear before drawing this {@link RenderPass} */
    clearValue: GPUColor;
    /** Optional format of the color attachment texture */
    targetFormat: GPUTextureFormat;
}
/**
 * Parameters used to create a {@link RenderPass}
 */
export type RenderPassParams = Partial<RenderPassOptions>;
/**
 * RenderPass class:
 * Used by [render targets]{@link RenderTarget} and the [renderer]{@link Renderer} to render to a specific [pass descriptor]{@link GPURenderPassDescriptor}
 */
export declare class RenderPass {
    /** [renderer]{@link Renderer} used by this {@link RenderPass} */
    renderer: Renderer;
    /** The type of the {@link RenderPass} */
    type: string;
    /** The universal unique id of this {@link RenderPass} */
    readonly uuid: string;
    /** Options used to create this {@link RenderPass} */
    options: RenderPassOptions;
    /** Size of the textures sources */
    size: RectSize;
    /** Whether the [renderer]{@link Renderer} is using multisampling */
    sampleCount: Renderer['sampleCount'];
    /** Depth [texture]{@link GPUTexture} to use with this {@link RenderPass} if it handles depth */
    depthTexture: GPUTexture | undefined;
    /** Render [texture]{@link GPUTexture} to use with this {@link RenderPass} */
    renderTexture: GPUTexture;
    /** The {@link RenderPass} [descriptor]{@link GPURenderPassDescriptor} */
    descriptor: GPURenderPassDescriptor;
    /**
     * RenderPass constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - [parameters]{@link RenderPassParams} used to create this {@link RenderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, depth, loadOp, clearValue, targetFormat, }?: Partial<RenderPassOptions>);
    /**
     * Set our [render pass depth texture]{@link RenderPass#depthTexture}
     */
    createDepthTexture(): void;
    /**
     * Set our [render pass render texture]{@link RenderPass#renderTexture}
     */
    createRenderTexture(): void;
    /**
     * Reset our [render pass depth texture]{@link RenderPass#depthTexture}
     */
    resetRenderPassDepth(): void;
    /**
     * Reset our [render pass render texture]{@link RenderPass#renderTexture}
     */
    resetRenderPassView(): void;
    /**
     * Set our [render pass descriptor]{@link RenderPass#descriptor}
     */
    setRenderPassDescriptor(): void;
    /**
     * Set our [render pass size]{@link RenderPass#size}
     * @param boundingRect - [bounding rectangle]{@link DOMElementBoundingRect} from which to get the width and height
     */
    setSize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Resize our {@link RenderPass}: set its size and recreate the textures
     * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
     */
    resize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Set our [load operation]{@link GPULoadOp}
     * @param loadOp - new [load operation]{@link GPULoadOp} to use
     */
    setLoadOp(loadOp?: GPULoadOp): void;
    /**
     * Set our [clear value]{@link GPUColor}
     * @param clearValue - new [clear value]{@link GPUColor} to use
     */
    setClearValue(clearValue?: GPUColor): void;
    /**
     * Destroy our {@link RenderPass}
     */
    destroy(): void;
}
