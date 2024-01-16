import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectSize } from '../DOM/DOMElement'

/**
 * Options used to create this {@link RenderPass}
 */
export interface RenderPassOptions {
  /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
  label: string
  /** Whether this {@link RenderPass} should handle a depth texture */
  depth: boolean
  /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
  loadOp: GPULoadOp
  /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
  clearValue: GPUColor
  /** Optional format of the color attachment texture */
  targetFormat: GPUTextureFormat
  /** Whether the {@link RenderPass#renderTexture | renderTexture} should use multisampling or not */
  sampleCount: GPUSize32
}

/**
 * Parameters used to create a {@link RenderPass}
 */
export type RenderPassParams = Partial<RenderPassOptions>

/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to a {@link RenderPass#renderTexture | renderTexture} using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
 */
export class RenderPass {
  /** {@link Renderer} used by this {@link RenderPass} */
  renderer: Renderer
  /** The type of the {@link RenderPass} */
  type: string
  /** The universal unique id of this {@link RenderPass} */
  readonly uuid: string

  /** Options used to create this {@link RenderPass} */
  options: RenderPassOptions

  /** Size of the textures sources */
  size: RectSize

  /** The {@link RenderPass} sample count (i.e. whether it should use multisampled antialiasing) */
  sampleCount: GPUSize32

  /** Depth {@link GPUTexture} to use with this {@link RenderPass} if it handles depth */
  depthTexture: GPUTexture | undefined
  /** Render {@link GPUTexture} to use with this {@link RenderPass} */
  renderTexture: GPUTexture
  /** The {@link RenderPass} {@link GPURenderPassDescriptor | descriptor} */
  descriptor: GPURenderPassDescriptor

  /**
   * RenderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
   * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    {
      label = 'Render Pass',
      depth = true,
      loadOp = 'clear',
      clearValue = [0, 0, 0, 0],
      targetFormat,
      sampleCount = 1,
    } = {} as RenderPassParams
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderPass')

    this.type = 'RenderPass'
    this.uuid = generateUUID()

    this.renderer = renderer
    this.options = {
      label,
      depth,
      loadOp,
      clearValue,
      targetFormat: targetFormat ?? this.renderer.preferredFormat,
    } as RenderPassOptions

    this.setClearValue(clearValue)

    this.setSize(this.renderer.pixelRatioBoundingRect)

    this.sampleCount = sampleCount

    // if needed, create a depth texture before our descriptor
    if (this.options.depth) this.createDepthTexture()
    this.createRenderTexture()

    this.setRenderPassDescriptor()
  }

  /**
   * Set our {@link depthTexture | depth texture}
   */
  createDepthTexture() {
    this.depthTexture = this.renderer.createTexture({
      label: this.options.label + ' depth attachment texture',
      size: [this.size.width, this.size.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.sampleCount,
    })
  }

  /**
   * Set our {@link renderTexture | render texture}
   */
  createRenderTexture() {
    this.renderTexture = this.renderer.createTexture({
      label: this.options.label + ' color attachment texture',
      size: [this.size.width, this.size.height],
      sampleCount: this.sampleCount,
      format: this.options.targetFormat,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING,
    })
  }

  /**
   * Reset our {@link depthTexture | depth texture}
   */
  resetRenderPassDepth() {
    if (this.depthTexture) {
      // Destroy the previous depth target
      this.depthTexture.destroy()
    }

    // recreate depth texture
    this.createDepthTexture()

    this.descriptor.depthStencilAttachment.view = this.depthTexture.createView()
  }

  /**
   * Reset our {@link renderTexture | render texture}
   */
  resetRenderPassView() {
    // set view
    if (this.renderTexture) {
      // Destroy the previous render target
      this.renderTexture.destroy()
    }

    this.createRenderTexture()

    this.descriptor.colorAttachments[0].view = this.renderTexture.createView()
  }

  /**
   * Set our render pass {@link descriptor}
   */
  setRenderPassDescriptor() {
    this.descriptor = {
      label: this.options.label + ' descriptor',
      colorAttachments: [
        {
          // view: <- to be filled out when we set our render pass view
          view: this.renderTexture.createView(),
          // clear values
          clearValue: this.options.clearValue,
          // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
          // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
          loadOp: this.options.loadOp,
          // storeOp: 'store' means store the result of what we draw.
          // We could also pass 'discard' which would throw away what we draw.
          // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
          storeOp: 'store',
        },
      ],
      ...(this.options.depth && {
        depthStencilAttachment: {
          view: this.depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      }),
    } as GPURenderPassDescriptor
  }

  /**
   * Set our render pass {@link size}
   * @param boundingRect - {@link DOMElementBoundingRect | bounding rectangle} from which to get the width and height
   */
  setSize(boundingRect: DOMElementBoundingRect) {
    this.size = {
      width: Math.floor(boundingRect.width),
      height: Math.floor(boundingRect.height),
    }
  }

  /**
   * Resize our {@link RenderPass}: set its size and recreate the textures
   * @param boundingRect - new {@link DOMElementBoundingRect | bounding rectangle}
   */
  resize(boundingRect: DOMElementBoundingRect) {
    this.setSize(boundingRect)

    // reset textures
    if (this.options.depth) this.resetRenderPassDepth()
    this.resetRenderPassView()
  }

  /**
   * Set our {@link GPULoadOp | load operation}
   * @param loadOp - new {@link GPULoadOp | load operation} to use
   */
  setLoadOp(loadOp: GPULoadOp = 'clear') {
    this.options.loadOp = loadOp
    if (this.descriptor && this.descriptor.colorAttachments) {
      this.descriptor.colorAttachments[0].loadOp = loadOp
    }
  }

  /**
   * Set our {@link GPUColor | clear colors value}.<br>
   * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
   * @param clearValue - new {@link GPUColor | clear colors value} to use
   */
  setClearValue(clearValue: GPUColor = [0, 0, 0, 0]) {
    if (this.renderer.alphaMode === 'premultiplied') {
      const alpha = clearValue[3]
      clearValue[0] = Math.min(clearValue[0], alpha)
      clearValue[1] = Math.min(clearValue[1], alpha)
      clearValue[2] = Math.min(clearValue[2], alpha)
    } else {
      this.options.clearValue = clearValue
    }

    if (this.descriptor && this.descriptor.colorAttachments) {
      this.descriptor.colorAttachments[0].clearValue = clearValue
    }
  }

  /**
   * Destroy our {@link RenderPass}
   */
  destroy() {
    this.renderTexture?.destroy()
    this.depthTexture?.destroy()
  }
}
