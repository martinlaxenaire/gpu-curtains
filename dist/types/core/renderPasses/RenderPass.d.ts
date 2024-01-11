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
    /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
    loadOp: GPULoadOp;
    /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
    clearValue: GPUColor;
    /** Optional format of the color attachment texture */
    targetFormat: GPUTextureFormat;
}
/**
 * Parameters used to create a {@link RenderPass}
 */
export type RenderPassParams = Partial<RenderPassOptions>;
/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to a {@link RenderPass#renderTexture | renderTexture} using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
 */
export declare class RenderPass {
    /** {@link Renderer} used by this {@link RenderPass} */
    renderer: Renderer;
    /** The type of the {@link RenderPass} */
    type: string;
    /** The universal unique id of this {@link RenderPass} */
    readonly uuid: string;
    /** Options used to create this {@link RenderPass} */
    options: RenderPassOptions;
    /** Size of the textures sources */
    size: RectSize;
    /** Whether the {@link Renderer} is using multisampling */
    sampleCount: Renderer['sampleCount'];
    /** Depth {@link GPUTexture} to use with this {@link RenderPass} if it handles depth */
    depthTexture: GPUTexture | undefined;
    /** Render {@link GPUTexture} to use with this {@link RenderPass} */
    renderTexture: GPUTexture;
    /** The {@link RenderPass} {@link GPURenderPassDescriptor | descriptor} */
    descriptor: GPURenderPassDescriptor;
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, depth, loadOp, clearValue, targetFormat, }?: Partial<RenderPassOptions>);
    /**
     * Set our {@link depthTexture | depth texture}
     */
    createDepthTexture(): void;
    /**
     * Set our {@link renderTexture | render texture}
     */
    createRenderTexture(): void;
    /**
     * Reset our {@link depthTexture | depth texture}
     */
    resetRenderPassDepth(): void;
    /**
     * Reset our {@link renderTexture | render texture}
     */
    resetRenderPassView(): void;
    /**
     * Set our render pass {@link descriptor}
     */
    setRenderPassDescriptor(): void;
    /**
     * Set our render pass {@link size}
     * @param boundingRect - {@link DOMElementBoundingRect | bounding rectangle} from which to get the width and height
     */
    setSize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Resize our {@link RenderPass}: set its size and recreate the textures
     * @param boundingRect - new {@link DOMElementBoundingRect | bounding rectangle}
     */
    resize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Set our {@link GPULoadOp | load operation}
     * @param loadOp - new {@link GPULoadOp | load operation} to use
     */
    setLoadOp(loadOp?: GPULoadOp): void;
    /**
     * Set our {@link GPUColor | clear colors value}
     * @param clearValue - new {@link GPUColor | clear colors value} to use
     */
    setClearValue(clearValue?: GPUColor): void;
    /**
     * Destroy our {@link RenderPass}
     */
    destroy(): void;
}
