/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTexture } from '../textures/RenderTexture';
/** Define the parameters of a color attachment */
export interface ColorAttachmentParams {
    /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
    loadOp?: GPULoadOp;
    /** The {@link GPUStoreOp | store operation} to perform while drawing this {@link RenderPass} */
    storeOp?: GPUStoreOp;
    /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
    clearValue?: GPUColor;
    /** Optional format of the color attachment texture */
    targetFormat: GPUTextureFormat;
}
/**
 * Parameters used to create this {@link RenderPass}
 */
export interface RenderPassParams {
    /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
    label?: string;
    /** Whether the {@link RenderPass | view and depth textures} should use multisampling or not */
    sampleCount?: GPUSize32;
    /** Force all the {@link RenderPass} textures size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size. Used mainly to lower the rendered definition. */
    qualityRatio?: number;
    /** Whether this {@link RenderPass} should handle a view texture */
    useColorAttachments?: boolean;
    /** Whether the main (first {@link colorAttachments}) view texture should use the content of the swap chain and render to it each frame */
    renderToSwapChain?: boolean;
    /** Array of one or multiple (Multiple Render Targets) color attachments parameters. */
    colorAttachments?: ColorAttachmentParams[];
    /** Whether this {@link RenderPass} should handle a depth texture */
    useDepth?: boolean;
    /** Whether this {@link RenderPass} should use an already created depth texture */
    depthTexture?: RenderTexture;
    /** The {@link GPULoadOp | depth load operation} to perform while drawing this {@link RenderPass} */
    depthLoadOp?: GPULoadOp;
    /** The {@link GPUStoreOp | depth store operation} to perform while drawing this {@link RenderPass} */
    depthStoreOp?: GPUStoreOp;
    /** The depth clear value to clear to before drawing this {@link RenderPass} */
    depthClearValue?: number;
    /** Optional format of the depth texture */
    depthFormat?: GPUTextureFormat;
}
/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to one or multiple {@link RenderPass#viewTextures | view textures} (and optionally a {@link RenderPass#depthTexture | depth texture}), using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
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
    /** Array of {@link RenderTexture} used for this {@link RenderPass} color attachments view textures */
    viewTextures: RenderTexture[];
    /** Array of {@link RenderTexture} used for this {@link RenderPass} color attachments resolve textures */
    resolveTargets: Array<null | RenderTexture>;
    /** The {@link RenderPass} {@link GPURenderPassDescriptor | descriptor} */
    descriptor: GPURenderPassDescriptor;
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, sampleCount, qualityRatio, useColorAttachments, renderToSwapChain, colorAttachments, useDepth, depthTexture, depthLoadOp, depthStoreOp, depthClearValue, depthFormat, }?: RenderPassParams);
    /**
     * Create and set our {@link depthTexture | depth texture}
     */
    createDepthTexture(): void;
    /**
     * Create and set our {@link viewTextures | view textures}
     */
    createViewTextures(): void;
    /**
     * Create and set our {@link resolveTargets | resolve targets} in case the {@link viewTextures} are multisampled.
     *
     * Note that if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}, the first resolve target will be set to `null` as the current swap chain texture will be used anyway in the render loop (see {@link updateView}).
     */
    createResolveTargets(): void;
    /**
     * Get the textures outputted by this {@link RenderPass}, which means the {@link viewTextures} if not multisampled, or their {@link resolveTargets} else (beware that the first resolve target might be `null` if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}).
     *
     * @readonly
     */
    get outputTextures(): RenderTexture[];
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
     * @param colorAttachmentIndex - index of the color attachment for which to use this load operation
     */
    setLoadOp(loadOp?: GPULoadOp, colorAttachmentIndex?: number): void;
    /**
     * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
     * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
     */
    setDepthLoadOp(depthLoadOp?: GPULoadOp): void;
    /**
     * Set our {@link GPUColor | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link GPUColor | clear colors value} to use
     * @param colorAttachmentIndex - index of the color attachment for which to use this clear value
     */
    setClearValue(clearValue?: GPUColor, colorAttachmentIndex?: number): void;
    /**
     * Set the current {@link descriptor} texture {@link GPURenderPassColorAttachment#view | view} and {@link GPURenderPassColorAttachment#resolveTarget | resolveTarget} (depending on whether we're using multisampling)
     * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
     * @returns - the {@link GPUTexture | texture} to render to.
     */
    updateView(renderTexture?: GPUTexture | null): GPUTexture | null;
    /**
     * Destroy our {@link RenderPass}
     */
    destroy(): void;
}
