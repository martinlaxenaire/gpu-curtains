import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'

/** Define the parameters of a color attachment */
export interface ColorAttachmentParams {
  /** The {@link GPULoadOp | load operation} to perform while drawing this {@link RenderPass} */
  loadOp?: GPULoadOp
  /** The {@link GPUStoreOp | store operation} to perform while drawing this {@link RenderPass} */
  storeOp?: GPUStoreOp
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

  /** Whether the {@link RenderPass | view and depth textures} should use multisampling or not */
  sampleCount?: GPUSize32

  /** Force all the {@link RenderPass} textures size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size. Used mainly to lower the rendered definition. */
  qualityRatio?: number

  /** Whether this {@link RenderPass} should handle a view texture */
  useColorAttachments?: boolean

  /** Whether the main (first {@link colorAttachments}) view texture should use the content of the swap chain and render to it each frame */
  renderToSwapChain?: boolean

  /** Array of one or multiple (Multiple Render Targets) color attachments parameters. */
  colorAttachments?: ColorAttachmentParams[]

  /** Whether this {@link RenderPass} should handle a depth texture */
  useDepth?: boolean
  /** Whether this {@link RenderPass} should use an already created depth texture */
  depthTexture?: Texture
  /** The {@link GPULoadOp | depth load operation} to perform while drawing this {@link RenderPass} */
  depthLoadOp?: GPULoadOp
  /** The {@link GPUStoreOp | depth store operation} to perform while drawing this {@link RenderPass} */
  depthStoreOp?: GPUStoreOp
  /** The depth clear value to clear to before drawing this {@link RenderPass} */
  depthClearValue?: number
  /** Optional format of the depth texture */
  depthFormat?: GPUTextureFormat
}

/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to one or multiple {@link RenderPass#viewTextures | view textures} (and optionally a {@link RenderPass#depthTexture | depth texture}), using a specific {@link GPURenderPassDescriptor | render pass descriptor}.
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

  /** Depth {@link Texture} to use with this {@link RenderPass} if it should handle depth */
  depthTexture: Texture | undefined

  /** Array of {@link Texture} used for this {@link RenderPass} color attachments view textures */
  viewTextures: Texture[]

  /** Array of {@link Texture} used for this {@link RenderPass} color attachments resolve textures */
  resolveTargets: Array<null | Texture>

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
      qualityRatio = 1,
      // color
      useColorAttachments = true,
      renderToSwapChain = true,
      colorAttachments = [],
      // depth
      useDepth = true,
      depthTexture = null,
      depthLoadOp = 'clear' as GPULoadOp,
      depthStoreOp = 'store' as GPUStoreOp,
      depthClearValue = 1,
      depthFormat = 'depth24plus' as GPUTextureFormat,
    } = {} as RenderPassParams
  ) {
    renderer = isRenderer(renderer, 'RenderPass')

    this.type = 'RenderPass'
    this.uuid = generateUUID()

    this.renderer = renderer

    if (useColorAttachments) {
      const defaultColorAttachment = {
        loadOp: 'clear' as GPULoadOp,
        storeOp: 'store' as GPUStoreOp,
        clearValue: [0, 0, 0, 0] as GPUColor,
        targetFormat: this.renderer.options.preferredFormat,
      }

      if (!colorAttachments.length) {
        colorAttachments = [defaultColorAttachment]
      } else {
        colorAttachments = colorAttachments.map((colorAttachment) => {
          return { ...defaultColorAttachment, ...colorAttachment }
        })
      }
    }

    this.options = {
      label,
      sampleCount,
      qualityRatio,
      // color
      useColorAttachments,
      renderToSwapChain,
      colorAttachments,
      // depth
      useDepth,
      ...(depthTexture !== undefined && { depthTexture }),
      depthLoadOp,
      depthStoreOp,
      depthClearValue,
      depthFormat,
    }

    // if needed, create a depth texture before our descriptor
    if (this.options.useDepth) {
      this.createDepthTexture()
    }

    // if needed, create a view texture before our descriptor
    this.viewTextures = []
    this.resolveTargets = []
    if (this.options.useColorAttachments && (!this.options.renderToSwapChain || this.options.sampleCount > 1)) {
      this.createViewTextures()
      this.createResolveTargets()
    }

    this.setRenderPassDescriptor()
  }

  /**
   * Create and set our {@link depthTexture | depth texture}
   */
  createDepthTexture() {
    if (this.options.depthTexture) {
      this.depthTexture = this.options.depthTexture
      // adjust depth format as well
      this.options.depthFormat = this.options.depthTexture.options.format
    } else {
      this.depthTexture = new Texture(this.renderer, {
        label: this.options.label + ' depth texture',
        name: 'depthTexture',
        format: this.options.depthFormat,
        sampleCount: this.options.sampleCount,
        qualityRatio: this.options.qualityRatio,
        type: 'depth',
        usage: ['renderAttachment', 'textureBinding'],
      })
    }
  }

  /**
   * Create and set our {@link viewTextures | view textures}
   */
  createViewTextures() {
    this.options.colorAttachments.forEach((colorAttachment, index) => {
      this.viewTextures.push(
        new Texture(this.renderer, {
          label: `${this.options.label} colorAttachment[${index}] view texture`,
          name: `colorAttachment${index}ViewTexture`,
          format: colorAttachment.targetFormat,
          sampleCount: this.options.sampleCount,
          qualityRatio: this.options.qualityRatio,
          type: 'texture',
          usage: ['copySrc', 'copyDst', 'renderAttachment', 'textureBinding'],
        })
      )
    })
  }

  /**
   * Create and set our {@link resolveTargets | resolve targets} in case the {@link viewTextures} are multisampled.
   *
   * Note that if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}, the first resolve target will be set to `null` as the current swap chain texture will be used anyway in the render loop (see {@link updateView}).
   */
  createResolveTargets() {
    if (this.options.sampleCount > 1) {
      this.options.colorAttachments.forEach((colorAttachment, index) => {
        this.resolveTargets.push(
          this.options.renderToSwapChain && index === 0
            ? null
            : new Texture(this.renderer, {
                label: `${this.options.label} resolve target[${index}] texture`,
                name: `resolveTarget${index}Texture`,
                format: colorAttachment.targetFormat,
                sampleCount: 1,
                qualityRatio: this.options.qualityRatio,
                type: 'texture',
              })
        )
      })
    }
  }

  /**
   * Get the textures outputted by this {@link RenderPass}, which means the {@link viewTextures} if not multisampled, or their {@link resolveTargets} else (beware that the first resolve target might be `null` if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}).
   *
   * @readonly
   */
  get outputTextures(): Texture[] {
    return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures
  }

  /**
   * Set our render pass {@link descriptor}
   */
  setRenderPassDescriptor(depthTextureView = null) {
    this.descriptor = {
      label: this.options.label + ' descriptor',
      colorAttachments: this.options.colorAttachments.map((colorAttachment, index) => {
        return {
          // view
          view: this.viewTextures[index]?.texture.createView({
            label: this.viewTextures[index]?.texture.label + ' view',
          }),
          ...(this.resolveTargets.length && {
            resolveTarget: this.resolveTargets[index]?.texture.createView({
              label: this.resolveTargets[index]?.texture.label + ' view',
            }),
          }),
          // clear values
          clearValue: colorAttachment.clearValue,
          // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
          // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
          loadOp: colorAttachment.loadOp,
          // storeOp: 'store' means store the result of what we draw.
          // We could also pass 'discard' which would throw away what we draw.
          // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
          storeOp: colorAttachment.storeOp,
        }
      }),

      ...(this.options.useDepth && {
        depthStencilAttachment: {
          view:
            depthTextureView ||
            this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + ' view',
            }),
          depthClearValue: this.options.depthClearValue,
          // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
          depthLoadOp: this.options.depthLoadOp,
          depthStoreOp: this.options.depthStoreOp,
        },
      }),
    }
  }

  /**
   * Resize our {@link RenderPass}: reset its {@link Texture}
   */
  resize() {
    // reassign textures
    if (this.options.useDepth) {
      this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
        label: this.depthTexture.options.label + ' view',
      })
    }

    this.viewTextures.forEach((viewTexture, index) => {
      this.descriptor.colorAttachments[index].view = viewTexture.texture.createView({
        label: viewTexture.options.label + ' view',
      })
    })

    this.resolveTargets.forEach((resolveTarget, index) => {
      if (resolveTarget) {
        this.descriptor.colorAttachments[index].resolveTarget = resolveTarget.texture.createView({
          label: resolveTarget.options.label + ' view',
        })
      }
    })
  }

  /**
   * Set the {@link descriptor} {@link GPULoadOp | load operation}
   * @param loadOp - new {@link GPULoadOp | load operation} to use
   * @param colorAttachmentIndex - index of the color attachment for which to use this load operation
   */
  setLoadOp(loadOp: GPULoadOp = 'clear', colorAttachmentIndex = 0) {
    if (this.options.useColorAttachments) {
      if (this.options.colorAttachments[colorAttachmentIndex]) {
        this.options.colorAttachments[colorAttachmentIndex].loadOp = loadOp
      }

      if (this.descriptor) {
        if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
          this.descriptor.colorAttachments[colorAttachmentIndex].loadOp = loadOp
        }
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
    if (this.options.useColorAttachments) {
      if (this.renderer.alphaMode === 'premultiplied') {
        const alpha = clearValue[3]
        clearValue[0] = Math.min(clearValue[0], alpha)
        clearValue[1] = Math.min(clearValue[1], alpha)
        clearValue[2] = Math.min(clearValue[2], alpha)
      }

      if (this.options.colorAttachments[colorAttachmentIndex]) {
        this.options.colorAttachments[colorAttachmentIndex].clearValue = clearValue
      }

      if (this.descriptor) {
        if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
          this.descriptor.colorAttachments[colorAttachmentIndex].clearValue = clearValue
        }
      }
    }
  }

  /**
   * Set the current {@link descriptor} texture {@link GPURenderPassColorAttachment#view | view} and {@link GPURenderPassColorAttachment#resolveTarget | resolveTarget} (depending on whether we're using multisampling)
   * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
   * @returns - the {@link GPUTexture | texture} to render to.
   */
  updateView(renderTexture: GPUTexture | null = null): GPUTexture | null {
    if (!this.options.colorAttachments.length || !this.options.renderToSwapChain) {
      return renderTexture
    }

    if (!renderTexture) {
      renderTexture = this.renderer.context.getCurrentTexture()
      renderTexture.label = `${this.renderer.type} context current texture`
    }

    if (this.options.sampleCount > 1) {
      this.descriptor.colorAttachments[0].view = this.viewTextures[0].texture.createView({
        label: this.viewTextures[0].options.label + ' view',
      })
      this.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView({
        label: renderTexture.label + ' resolve target view',
      })
    } else {
      this.descriptor.colorAttachments[0].view = renderTexture.createView({
        label: renderTexture.label + ' view',
      })
    }

    return renderTexture
  }

  /**
   * Destroy our {@link RenderPass}
   */
  destroy() {
    this.viewTextures.forEach((viewTexture) => viewTexture.destroy())
    this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy())

    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy()
    }
  }
}
