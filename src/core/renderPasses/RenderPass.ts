import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'

/**
 * Parameters used to create this {@link RenderPass}
 */
export interface RenderPassParams {
  /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
  label?: string
  /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
  loadOp?: GPULoadOp
  /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
  clearValue?: GPUColor
  /** Optional format of the color attachment texture */
  targetFormat: GPUTextureFormat
  /** Whether the {@link RenderPass#viewTexture | view texture} should use multisampling or not */
  sampleCount?: GPUSize32

  /** Whether this {@link RenderPass} should handle a depth texture */
  depth?: boolean
  /** Whether this {@link RenderPass} should use an already created depth texture */
  depthTexture?: RenderTexture
  /** The {@link GPULoadOp | depth load operation} to perform while drawing this {@link RenderPass} */
  depthLoadOp?: GPULoadOp
  /** The depth clear value to clear to before drawing this {@link RenderPass} */
  depthClearValue?: GPURenderPassDepthStencilAttachment['depthClearValue']
}

/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to a {@link RenderPass#viewTexture | view texture} using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
 */
export class RenderPass {
  /** {@link Renderer} used by this {@link RenderPass} */
  renderer: Renderer
  /** The type of the {@link RenderPass} */
  type: string
  /** The universal unique id of this {@link RenderPass} */
  readonly uuid: string

  /** Options used to create this {@link RenderPass} */
  options: RenderPassParams

  /** Depth {@link RenderTexture} to use with this {@link RenderPass} if it should handle depth */
  depthTexture: RenderTexture | undefined
  /** Color attachment {@link RenderTexture} to use with this {@link RenderPass} */
  viewTexture: RenderTexture
  /** Resolve {@link RenderTexture} to use with this {@link RenderPass} if it is using multisampling */
  //resolveTexture: RenderTexture | undefined

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
      sampleCount = 4,
      loadOp = 'clear' as GPULoadOp,
      clearValue = [0, 0, 0, 0],
      targetFormat,
      depth = true,
      depthTexture,
      depthLoadOp = 'clear' as GPULoadOp,
      depthClearValue = 1,
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
      sampleCount,
      // color
      loadOp,
      clearValue,
      targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
      // depth
      depth,
      ...(depthTexture !== undefined && { depthTexture }),
      depthLoadOp,
      depthClearValue,
    }

    this.setClearValue(clearValue)

    // if needed, create a depth texture before our descriptor
    if (this.options.depth) {
      this.createDepthTexture()
    }

    this.viewTexture = new RenderTexture(this.renderer, {
      label: this.options.label + ' view texture',
      name: 'viewTexture',
      format: this.options.targetFormat,
      sampleCount: this.options.sampleCount,
    })

    // if (this.options.sampleCount > 1) {
    //   this.resolveTexture = new RenderTexture(this.renderer, {
    //     label: this.options.label + ' resolve texture',
    //     name: 'resolveTexture',
    //     format: this.options.targetFormat,
    //   })
    // }

    this.setRenderPassDescriptor()
  }

  /**
   * Set our {@link depthTexture | depth texture}
   */
  createDepthTexture() {
    this.depthTexture = new RenderTexture(this.renderer, {
      label: this.options.label + ' depth texture',
      name: 'depthTexture',
      usage: 'depthTexture',
      format: 'depth24plus',
      sampleCount: this.options.sampleCount,
      ...(this.options.depthTexture && { fromTexture: this.options.depthTexture }),
    })
  }

  /**
   * Reset our {@link depthTexture | depth texture}
   */
  resetRenderPassDepth() {
    this.depthTexture.forceResize({
      width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
      height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
      depth: 1,
    })

    this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
      label: this.depthTexture.options.label + ' view',
    })
  }

  /**
   * Reset our {@link viewTexture | view texture}
   */
  resetRenderPassView() {
    this.viewTexture.forceResize({
      width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
      height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
      depth: 1,
    })

    this.descriptor.colorAttachments[0].view = this.viewTexture.texture.createView({
      label: this.viewTexture.options.label + ' view',
    })

    // if (this.options.sampleCount > 1) {
    //   this.resolveTexture.forceResize({
    //     width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
    //     height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
    //     depth: 1,
    //   })
    //
    //   this.descriptor.colorAttachments[0].resolveTarget = this.resolveTexture.texture.createView()
    // }
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
          view: this.viewTexture.texture.createView({
            label: this.viewTexture.options.label + ' view',
          }),
          // ...(this.options.sampleCount > 1 && {
          //   resolveTarget: this.resolveTexture.texture.createView({
          //     label: this.resolveTexture.options.label + ' view',
          //   }),
          // }),
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
          view: this.depthTexture.texture.createView({
            label: this.depthTexture.options.label + ' view',
          }),
          depthClearValue: this.options.depthClearValue,
          // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
          depthLoadOp: this.options.depthLoadOp,
          depthStoreOp: 'store',
        },
      }),
    } as GPURenderPassDescriptor
  }

  /**
   * Resize our {@link RenderPass}: reset its {@link RenderTexture}
   */
  resize() {
    // reset textures
    if (this.options.depth) this.resetRenderPassDepth()
    this.resetRenderPassView()
  }

  /**
   * Set the {@link descriptor} {@link GPULoadOp | load operation}
   * @param loadOp - new {@link GPULoadOp | load operation} to use
   */
  setLoadOp(loadOp: GPULoadOp = 'clear') {
    this.options.loadOp = loadOp
    if (this.descriptor) {
      if (this.descriptor.colorAttachments) {
        this.descriptor.colorAttachments[0].loadOp = loadOp
      }
    }
  }

  /**
   * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
   * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
   */
  setDepthLoadOp(depthLoadOp: GPULoadOp = 'clear') {
    this.options.depthLoadOp = depthLoadOp
    if (this.options.depth && this.descriptor.depthStencilAttachment) {
      this.descriptor.depthStencilAttachment.depthLoadOp = depthLoadOp
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
    this.viewTexture?.destroy()

    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy()
    }

    //this.resolveTexture?.destroy()
  }
}
