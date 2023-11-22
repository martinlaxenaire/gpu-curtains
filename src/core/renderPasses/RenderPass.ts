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
  /** The [load operation]{@link GPULoadOp} to perform while drawing this {@link RenderPass} */
  loadOp: GPULoadOp
  /** The [color values]{@link GPUColor} to clear before drawing this {@link RenderPass} */
  clearValue: GPUColor
}

/**
 * Parameters used to create a {@link RenderPass}
 */
export type RenderPassParams = Partial<RenderPassOptions>

/**
 * RenderPass class:
 * Used by [render targets]{@link RenderTarget} and the [renderer]{@link Renderer} to render to a specific [pass descriptor]{@link GPURenderPassDescriptor}
 */
export class RenderPass {
  /** [renderer]{@link Renderer} used by this {@link RenderPass} */
  renderer: Renderer
  /** The type of the {@link RenderPass} */
  type: string
  /** The universal unique id of this {@link RenderPass} */
  readonly uuid: string

  /** Options used to create this {@link RenderPass} */
  options: RenderPassOptions

  /** Size of the textures sources */
  size: RectSize

  /** Whether the [renderer]{@link Renderer} is using multisampling */
  sampleCount: Renderer['sampleCount']

  /** Depth [texture]{@link GPUTexture} to use with this {@link RenderPass} if it handles depth */
  depthTexture: GPUTexture | undefined
  /** Render [texture]{@link GPUTexture} to use with this {@link RenderPass} */
  renderTexture: GPUTexture
  /** The {@link RenderPass} [descriptor]{@link GPURenderPassDescriptor} */
  descriptor: GPURenderPassDescriptor

  /**
   * RenderPass constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
   * @param parameters - [parameters]{@link RenderPassParams} used to create this {@link RenderPass}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label = 'Render Pass', depth = true, loadOp = 'clear', clearValue = [0, 0, 0, 0] } = {} as RenderPassParams
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
    } as RenderPassOptions

    this.setSize(this.renderer.pixelRatioBoundingRect)

    this.sampleCount = this.renderer.sampleCount

    // if needed, create a depth texture before our descriptor
    if (this.options.depth) this.createDepthTexture()
    this.createRenderTexture()

    this.setRenderPassDescriptor()
  }

  /**
   * Set our [render pass depth texture]{@link RenderPass#depthTexture}
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
   * Set our [render pass render texture]{@link RenderPass#renderTexture}
   */
  createRenderTexture() {
    this.renderTexture = this.renderer.createTexture({
      label: this.options.label + ' color attachment texture',
      size: [this.size.width, this.size.height],
      sampleCount: this.sampleCount,
      format: this.renderer.preferredFormat,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING,
    })
  }

  /**
   * Reset our [render pass depth texture]{@link RenderPass#depthTexture}
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
   * Reset our [render pass render texture]{@link RenderPass#renderTexture}
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
   * Set our [render pass descriptor]{@link RenderPass#descriptor}
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
   * Set our [render pass size]{@link RenderPass#size}
   * @param boundingRect - [bounding rectangle]{@link DOMElementBoundingRect} from which to get the width and height
   */
  setSize(boundingRect: DOMElementBoundingRect) {
    this.size = {
      width: Math.floor(boundingRect.width),
      height: Math.floor(boundingRect.height),
    }
  }

  /**
   * Resize our {@link RenderPass}: set its size and recreate the textures
   * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
   */
  resize(boundingRect: DOMElementBoundingRect) {
    this.setSize(boundingRect)

    // reset textures
    if (this.options.depth) this.resetRenderPassDepth()
    this.resetRenderPassView()
  }

  /**
   * Set our [load operation]{@link GPULoadOp}
   * @param loadOp - new [load operation]{@link GPULoadOp} to use
   */
  setLoadOp(loadOp: GPULoadOp = 'clear') {
    this.options.loadOp = loadOp
    if (this.descriptor && this.descriptor.colorAttachments) {
      this.descriptor.colorAttachments[0].loadOp = loadOp
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
