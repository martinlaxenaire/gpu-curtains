/// <reference types="@webgpu/types" />
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Texture } from '../textures/Texture';
import { TextureSize } from '../../types/Textures';
import { RectBBox } from '../DOM/DOMElement';
/** Define the parameters of a color attachment. */
export interface ColorAttachmentParams {
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to perform while drawing this {@link RenderPass}. */
    loadOp?: GPULoadOp;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#storeop | store operation} to perform while drawing this {@link RenderPass}. */
    storeOp?: GPUStoreOp;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | color values} to clear to before drawing this {@link RenderPass}. */
    clearValue?: GPUColor;
    /** Optional format of the color attachment texture. */
    targetFormat: GPUTextureFormat;
    /** Indicates the depth slice index of the '3d' texture viewDimension view that will be output to for this color attachment. */
    depthSlice?: GPUIntegerCoordinate;
}
/** Parameters used to set a {@link GPURenderPassEncoder} viewport. */
export interface RenderPassViewport extends RectBBox {
    /** Minimum depth value of the viewport. Default to `0`. */
    minDepth: number;
    /** Maximum depth value of the viewport. Default to `1`. */
    maxDepth: number;
}
/**
 * Options used to create this {@link RenderPass}.
 */
export interface RenderPassOptions {
    /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose. */
    label: string;
    /** Whether the {@link RenderPass | view and depth textures} should use multisampling or not. Default to `4`. */
    sampleCount: GPUSize32;
    /** Force all the {@link RenderPass} textures size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size. Used mainly to lower the rendered definition. Default to `1`. */
    qualityRatio: number;
    /** Force the all the {@link RenderPass} textures to be set at given size. Used mainly to force a lower rendered definition at a given size. Default to `null`. */
    fixedSize: TextureSize | null;
    /** Whether this {@link RenderPass} should handle a view texture. Default to `true`. */
    useColorAttachments: boolean;
    /** Whether the main (first {@link colorAttachments}) view texture should use the content of the swap chain and render to it each frame. Default to `true`. */
    renderToSwapChain: boolean;
    /** Array of one or multiple (Multiple Render Targets) color attachments parameters. Default to `[]`. */
    colorAttachments: ColorAttachmentParams[];
    /** Whether this {@link RenderPass} should handle a depth texture. Default to `true`. */
    useDepth: boolean;
    /** Whether this {@link RenderPass} should use an already created depth texture. */
    depthTexture?: Texture;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to perform while drawing this {@link RenderPass}. Default to `'clear`. */
    depthLoadOp: GPULoadOp;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstoreop | depth store operation} to perform while drawing this {@link RenderPass}. Default to `'store'`. */
    depthStoreOp: GPUStoreOp;
    /** The depth clear value to clear to before drawing this {@link RenderPass}. Default to `1`. */
    depthClearValue: number;
    /** Optional format of the depth texture. Default to `'depth24plus'`. */
    depthFormat: GPUTextureFormat;
    /** Indicates that the depth component of the depth texture view is read only. Default to `false`. */
    depthReadOnly: boolean;
    /** A number indicating the value to clear view's stencil component to prior to executing the render pass. This is ignored if stencilLoadOp is not set to "clear". Default to `0`. */
    stencilClearValue: number;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#stencilloadop | stencil load operation} to perform while drawing this {@link RenderPass}. Default to `'clear`. */
    stencilLoadOp: GPULoadOp;
    /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#stencilstoreop | stencil store operation} to perform while drawing this {@link RenderPass}. Default to `'store'`. */
    stencilStoreOp: GPUStoreOp;
    /** Indicates that the stencil component of the depth texture view is read only. Default to `false`. */
    stencilReadOnly: boolean;
}
/**
 * Parameters used to create this {@link RenderPass}.
 */
export interface RenderPassParams extends Partial<RenderPassOptions> {
}
/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to one or multiple {@link RenderPass#viewTextures | view textures} (and optionally a {@link RenderPass#depthTexture | depth texture}), using a specific {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#descriptor | GPURenderPassDescriptor}.
 */
export declare class RenderPass {
    #private;
    /** {@link Renderer} used by this {@link RenderPass}. */
    renderer: Renderer;
    /** The type of the {@link RenderPass}. */
    type: string;
    /** The universal unique id of this {@link RenderPass}. */
    readonly uuid: string;
    /** Options used to create this {@link RenderPass}. */
    options: RenderPassOptions;
    /** Depth {@link Texture} to use with this {@link RenderPass} if it should handle depth .*/
    depthTexture: Texture | undefined;
    /** Array of {@link Texture} used for this {@link RenderPass} color attachments view textures. */
    viewTextures: Texture[];
    /** Array of {@link Texture} used for this {@link RenderPass} color attachments resolve textures. */
    resolveTargets: Array<null | Texture>;
    /** The {@link RenderPass} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#descriptor | GPURenderPassDescriptor}. */
    descriptor: GPURenderPassDescriptor;
    /** Viewport to set to the {@link GPURenderPassEncoder} if any. */
    viewport: RenderPassViewport | null;
    /** Scissor {@link RectBBox} to use for scissors if any. */
    scissorRect: RectBBox | null;
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}.
     */
    constructor(renderer: Renderer | GPUCurtains, { label, sampleCount, qualityRatio, fixedSize, useColorAttachments, renderToSwapChain, colorAttachments, useDepth, depthTexture, depthLoadOp, depthStoreOp, depthClearValue, depthFormat, depthReadOnly, stencilClearValue, stencilLoadOp, stencilStoreOp, stencilReadOnly, }?: RenderPassParams);
    /**
     * Initialize the {@link RenderPass} textures and descriptor.
     */
    init(): void;
    /**
     * Reset this {@link RenderPass} {@link RenderPass.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Create and set our {@link depthTexture | depth texture}.
     */
    createDepthTexture(): void;
    /**
     * Create and set our {@link viewTextures | view textures}.
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
     * @readonly
     */
    get outputTextures(): Texture[];
    /**
     * Set our render pass {@link descriptor}.
     */
    setRenderPassDescriptor(depthTextureView?: any): void;
    /**
     * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
     * @readonly
     */
    get depthStencilAttachmentSettings(): Omit<GPURenderPassDescriptor['depthStencilAttachment'], 'view'>;
    /**
     * Set the {@link viewport} to use if any.
     * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
     */
    setViewport(viewport?: RenderPassViewport | null): void;
    /**
     * Set the {@link scissorRect} to use if any.
     * @param scissorRect - {@link RectBBox} size to use for scissors. Can be set to `null` to cancel the {@link scissorRect}.
     */
    setScissorRect(scissorRect?: RectBBox | null): void;
    /**
     * Begin the {@link GPURenderPassEncoder} and eventually set the {@link viewport} and {@link scissorRect}.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     * @param descriptor - Custom {@link https://gpuweb.github.io/types/interfaces/GPURenderPassDescriptor.html | GPURenderPassDescriptor} to use if any. Default to {@link RenderPass#descriptor | descriptor}.
     * @returns - The created {@link GPURenderPassEncoder}.
     */
    beginRenderPass(commandEncoder: GPUCommandEncoder, descriptor?: GPURenderPassDescriptor): GPURenderPassEncoder;
    /**
     * Update our {@link RenderPass} textures quality ratio.
     * @param qualityRatio - New quality ratio to use.
     */
    setQualityRatio(qualityRatio?: number): void;
    /**
     * Resize our {@link RenderPass}: reset its {@link Texture}.
     */
    resize(): void;
    /**
     * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation}.
     * @param loadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to use.
     * @param colorAttachmentIndex - index of the color attachment for which to use this load operation.
     */
    setLoadOp(loadOp?: GPULoadOp, colorAttachmentIndex?: number): void;
    /**
     * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation}.
     * @param depthLoadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to use.
     */
    setDepthLoadOp(depthLoadOp?: GPULoadOp): void;
    /**
     * Set the new {@link RenderPassParams.depthReadOnly | depthReadOnly} setting.
     * @param value - Whether the depth buffer should be read-only or not.
     */
    setDepthReadOnly(value: boolean): void;
    /**
     * Set the new {@link RenderPassParams.stencilReadOnly | stencilReadOnly} setting.
     * @param value - Whether the stencil buffer should be read-only or not.
     */
    setStencilReadOnly(value: boolean): void;
    /**
     * Set our {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURendererContextOptions#alphaMode | premultiplied alpha mode}, your `R`, `G` and `B` channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value} to use.
     * @param colorAttachmentIndex - index of the color attachment for which to use this clear value.
     */
    setClearValue(clearValue?: GPUColor, colorAttachmentIndex?: number): void;
    /**
     * Set the current {@link descriptor} texture {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#view | view} and {@link GPUCommandEncoder.beginRenderPass().resolveTarget | resolveTarget} (depending on whether we're using multisampling).
     * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
     * @returns - the {@link GPUTexture | texture} to render to.
     */
    updateView(renderTexture?: GPUTexture | null): GPUTexture | null;
    /**
     * Destroy our {@link RenderPass}.
     */
    destroy(): void;
}
