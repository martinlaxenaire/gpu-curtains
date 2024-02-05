import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'

export interface ColorAttachmentParams {
  /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
  loadOp?: GPULoadOp
  /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
  clearValue?: GPUColor
  /** Optional format of the color attachment texture */
  targetFormat: GPUTextureFormat
}

/**
 * Parameters used to create this {@link RenderPass}
 */
export interface RenderPassParams {
  /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose */
  label?: string

  /** Whether the {@link RenderPass#viewTexture | view texture} should use multisampling or not */
  sampleCount?: GPUSize32

  /** Whether this {@link RenderPass} should handle a view texture */
  useColorAttachments?: boolean
  /** Whether the main (first {@link colorAttachments}) view texture should be updated each frame */
  shouldUpdateView?: boolean
  /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
  loadOp?: GPULoadOp
  /** The {@link GPUColor | color values} to clear to before drawing this {@link RenderPass} */
  clearValue?: GPUColor
  /** Optional format of the color attachment texture */
  targetFormat: GPUTextureFormat

  colorAttachments?: ColorAttachmentParams[]

  /** Whether this {@link RenderPass} should handle a depth texture */
  useDepth?: boolean
  /** Whether this {@link RenderPass} should use an already created depth texture */
  depthTexture?: RenderTexture
  /** The {@link GPULoadOp | depth load operation} to perform while drawing this {@link RenderPass} */
  depthLoadOp?: GPULoadOp
  /** The depth clear value to clear to before drawing this {@link RenderPass} */
  depthClearValue?: GPURenderPassDepthStencilAttachment['depthClearValue']
  /** Optional format of the depth texture */
  depthFormat?: GPUTextureFormat
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

  /** Array of {@link RenderTexture} used for this {@link RenderPass} color attachments view textures */
  viewTextures: RenderTexture[]

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
      // color
      useColorAttachments = true,
      shouldUpdateView = true,
      loadOp = 'clear' as GPULoadOp,
      clearValue = [0, 0, 0, 0],
      targetFormat,
      colorAttachments = [],
      // depth
      useDepth = true,
      depthTexture = null,
      depthLoadOp = 'clear' as GPULoadOp,
      depthClearValue = 1,
      depthFormat = 'depth24plus' as GPUTextureFormat,
    } = {} as RenderPassParams
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderPass')

    this.type = 'RenderPass'
    this.uuid = generateUUID()

    this.renderer = renderer

    if (useColorAttachments) {
      const defaultColorAttachment = {
        loadOp,
        clearValue,
        targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
      }

      if (!colorAttachments.length) {
        colorAttachments = [defaultColorAttachment]
      } else {
        colorAttachments[0] = { ...defaultColorAttachment, ...colorAttachments[0] }
      }
    }

    this.options = {
      label,
      sampleCount,
      // color
      useColorAttachments,
      shouldUpdateView,
      loadOp,
      clearValue,
      targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
      colorAttachments,
      // depth
      useDepth,
      ...(depthTexture !== undefined && { depthTexture }),
      depthLoadOp,
      depthClearValue,
      depthFormat,
    }

    this.setClearValue(clearValue)

    // if needed, create a depth texture before our descriptor
    if (this.options.useDepth) {
      this.createDepthTexture()
    }

    // if needed, create a view texture before our descriptor
    this.viewTextures = []
    if (this.options.useColorAttachments) {
      this.createViewTextures()
    }

    this.setRenderPassDescriptor()
  }

  /**
   * Create and set our {@link depthTexture | depth texture}
   */
  createDepthTexture() {
    if (this.options.depthTexture) {
      this.depthTexture = this.options.depthTexture
    } else {
      this.depthTexture = new RenderTexture(this.renderer, {
        label: this.options.label + ' depth texture',
        name: 'depthTexture',
        usage: 'depth',
        format: this.options.depthFormat,
        sampleCount: this.options.sampleCount,
      })
    }
  }

  /**
   * Create and set our {@link viewTexture | view textures}
   */
  createViewTextures() {
    this.options.colorAttachments.forEach((colorAttachment, index) => {
      this.viewTextures.push(
        new RenderTexture(this.renderer, {
          label: `${this.options.label} colorAttachment[${index}] view texture`,
          name: `colorAttachment${index}ViewTexture`,
          format: colorAttachment.targetFormat,
          sampleCount: this.options.sampleCount,
        })
      )
    })
  }

  /**
   * Set our render pass {@link descriptor}
   */
  setRenderPassDescriptor() {
    this.descriptor = {
      label: this.options.label + ' descriptor',
      colorAttachments: this.options.colorAttachments.map((colorAttachment, index) => {
        return {
          // view
          view: this.viewTextures[index].texture.createView({
            label: this.viewTextures[index].texture.label + ' view',
          }),
          // clear values
          clearValue: colorAttachment.clearValue,
          // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
          // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
          loadOp: colorAttachment.loadOp,
          // storeOp: 'store' means store the result of what we draw.
          // We could also pass 'discard' which would throw away what we draw.
          // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
          storeOp: 'store',
        }
      }),

      ...(this.options.useDepth && {
        depthStencilAttachment: {
          view: this.depthTexture.texture.createView({
            label: this.depthTexture.texture.label + ' view',
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
    // reassign textures
    if (this.options.useDepth) {
      this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
        label: this.depthTexture.options.label + ' view',
      })
    }

    if (this.options.useColorAttachments) {
      this.viewTextures.forEach((viewTexture, index) => {
        this.descriptor.colorAttachments[index].view = viewTexture.texture.createView({
          label: viewTexture.options.label + ' view',
        })
      })
    }
  }

  /**
   * Set the {@link descriptor} {@link GPULoadOp | load operation}
   * @param loadOp - new {@link GPULoadOp | load operation} to use
   * @param colorAttachmentIndex - index of the color attachment for which to use this load operation
   */
  setLoadOp(loadOp: GPULoadOp = 'clear', colorAttachmentIndex = 0) {
    this.options.loadOp = loadOp
    if (this.options.useColorAttachments && this.descriptor) {
      if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
        this.descriptor.colorAttachments[colorAttachmentIndex].loadOp = loadOp
      }
    }
  }

  /**
   * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
   * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
   */
  setDepthLoadOp(depthLoadOp: GPULoadOp = 'clear') {
    this.options.depthLoadOp = depthLoadOp
    if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
      this.descriptor.depthStencilAttachment.depthLoadOp = depthLoadOp
    }
  }

  /**
   * Set our {@link GPUColor | clear colors value}.<br>
   * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
   * @param clearValue - new {@link GPUColor | clear colors value} to use
   * @param colorAttachmentIndex - index of the color attachment for which to use this clear value
   */
  setClearValue(clearValue: GPUColor = [0, 0, 0, 0], colorAttachmentIndex = 0) {
    if (this.renderer.alphaMode === 'premultiplied') {
      const alpha = clearValue[3]
      clearValue[0] = Math.min(clearValue[0], alpha)
      clearValue[1] = Math.min(clearValue[1], alpha)
      clearValue[2] = Math.min(clearValue[2], alpha)
    } else {
      this.options.clearValue = clearValue
    }

    if (this.descriptor && this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
      this.descriptor.colorAttachments[colorAttachmentIndex].clearValue = clearValue
    }
  }

  /**
   * Destroy our {@link RenderPass}
   */
  destroy() {
    this.viewTextures.forEach((viewTexture) => viewTexture.destroy())

    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy()
    }
  }
}
