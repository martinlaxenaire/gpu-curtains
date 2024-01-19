/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTexture } from '../textures/RenderTexture';
/**
 * Parameters used to create this {@link RenderPass}
 */
export interface RenderPassParams {
    /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
    label?: string;
    /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
    loadOp?: GPULoadOp;
    /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
    clearValue?: GPUColor;
    /** Optional format of the color attachment texture */
    targetFormat: GPUTextureFormat;
    /** Whether the {@link RenderPass#viewTexture | view texture} should use multisampling or not */
    sampleCount?: GPUSize32;
    /** Whether this {@link RenderPass} should handle a depth texture */
    depth?: boolean;
    /** Whether this {@link RenderPass} should use an already created depth texture */
    depthTexture?: RenderTexture;
    /** The {@link GPULoadOp | depth load operation} to perform while drawing this {@link RenderPass} */
    depthLoadOp?: GPULoadOp;
    /** The depth clear value to clear to before drawing this {@link RenderPass} */
    depthClearValue?: GPURenderPassDepthStencilAttachment['depthClearValue'];
}
/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to a {@link RenderPass#viewTexture | view texture} using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
 */
export declare class RenderPass {
    /** {@link Renderer} used by this {@link RenderPass} */
    renderer: Renderer;
    /** The type of the {@link RenderPass} */
    type: string;
    /** The universal unique id of this {@link RenderPass} */
    readonly uuid: string;
    /** Options used to create this {@link RenderPass} */
    options: RenderPassParams;
    /** Depth {@link RenderTexture} to use with this {@link RenderPass} if it should handle depth */
    depthTexture: RenderTexture | undefined;
    /** Color attachment {@link RenderTexture} to use with this {@link RenderPass} */
    viewTexture: RenderTexture;
    /** Resolve {@link RenderTexture} to use with this {@link RenderPass} if it is using multisampling */
    /** The {@link RenderPass} {@link GPURenderPassDescriptor | descriptor} */
    descriptor: GPURenderPassDescriptor;
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, sampleCount, loadOp, clearValue, targetFormat, depth, depthTexture, depthLoadOp, depthClearValue, }?: RenderPassParams);
    /**
     * Set our {@link depthTexture | depth texture}
     */
    createDepthTexture(): void;
    /**
     * Reset our {@link depthTexture | depth texture}
     */
    resetRenderPassDepth(): void;
    /**
     * Reset our {@link viewTexture | view texture}
     */
    resetRenderPassView(): void;
    /**
     * Set our render pass {@link descriptor}
     */
    setRenderPassDescriptor(): void;
    /**
     * Resize our {@link RenderPass}: reset its {@link RenderTexture}
     */
    resize(): void;
    /**
     * Set the {@link descriptor} {@link GPULoadOp | load operation}
     * @param loadOp - new {@link GPULoadOp | load operation} to use
     */
    setLoadOp(loadOp?: GPULoadOp): void;
    /**
     * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
     * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
     */
    setDepthLoadOp(depthLoadOp?: GPULoadOp): void;
    /**
     * Set our {@link GPUColor | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link GPUColor | clear colors value} to use
     */
    setClearValue(clearValue?: GPUColor): void;
    /**
     * Destroy our {@link RenderPass}
     */
    destroy(): void;
}
