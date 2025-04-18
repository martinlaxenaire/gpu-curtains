import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { TextureSize } from '../../types/Textures'
import { RectBBox } from '../DOM/DOMElement'

/** Define the parameters of a color attachment. */
export interface ColorAttachmentParams {
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to perform while drawing this {@link RenderPass}. */
  loadOp?: GPULoadOp
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#storeop | store operation} to perform while drawing this {@link RenderPass}. */
  storeOp?: GPUStoreOp
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | color values} to clear to before drawing this {@link RenderPass}. */
  clearValue?: GPUColor
  /** Optional format of the color attachment texture. */
  targetFormat: GPUTextureFormat
  /** Indicates the depth slice index of the '3d' texture viewDimension view that will be output to for this color attachment. */
  depthSlice?: GPUIntegerCoordinate
}

/** Parameters used to set a {@link GPURenderPassEncoder} viewport. */
export interface RenderPassViewport extends RectBBox {
  /** Minimum depth value of the viewport. Default to `0`. */
  minDepth: number
  /** Maximum depth value of the viewport. Default to `1`. */
  maxDepth: number
}

/**
 * Options used to create this {@link RenderPass}.
 */
export interface RenderPassOptions {
  /** The label of the {@link RenderPass}, sent to various GPU objects for debugging purpose. */
  label: string

  /** Whether the {@link RenderPass | view and depth textures} should use multisampling or not. Default to `4`. */
  sampleCount: GPUSize32

  /** Force all the {@link RenderPass} textures size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size. Used mainly to lower the rendered definition. Default to `1`. */
  qualityRatio: number
  /** Force the all the {@link RenderPass} textures to be set at given size. Used mainly to force a lower rendered definition at a given size. Default to `null`. */
  fixedSize: TextureSize | null

  /** Whether this {@link RenderPass} should handle a view texture. Default to `true`. */
  useColorAttachments: boolean

  /** Whether the main (first {@link colorAttachments}) view texture should use the content of the swap chain and render to it each frame. Default to `true`. */
  renderToSwapChain: boolean

  /** Array of one or multiple (Multiple Render Targets) color attachments parameters. Default to `[]`. */
  colorAttachments: ColorAttachmentParams[]

  /** Whether this {@link RenderPass} should handle a depth texture. Default to `true`. */
  useDepth: boolean
  /** Whether this {@link RenderPass} should use an already created depth texture. */
  depthTexture?: Texture
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to perform while drawing this {@link RenderPass}. Default to `'clear`. */
  depthLoadOp: GPULoadOp
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstoreop | depth store operation} to perform while drawing this {@link RenderPass}. Default to `'store'`. */
  depthStoreOp: GPUStoreOp
  /** The depth clear value to clear to before drawing this {@link RenderPass}. Default to `1`. */
  depthClearValue: number
  /** Optional format of the depth texture. Default to `'depth24plus'`. */
  depthFormat: GPUTextureFormat

  /** Indicates that the depth component of the depth texture view is read only. Default to `false`. */
  depthReadOnly: boolean
  /** A number indicating the value to clear view's stencil component to prior to executing the render pass. This is ignored if stencilLoadOp is not set to "clear". Default to `0`. */
  stencilClearValue: number
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#stencilloadop | stencil load operation} to perform while drawing this {@link RenderPass}. Default to `'clear`. */
  stencilLoadOp: GPULoadOp
  /** The {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#stencilstoreop | stencil store operation} to perform while drawing this {@link RenderPass}. Default to `'store'`. */
  stencilStoreOp: GPUStoreOp
  /** Indicates that the stencil component of the depth texture view is read only. Default to `false`. */
  stencilReadOnly: boolean
}

/**
 * Parameters used to create this {@link RenderPass}.
 */
export interface RenderPassParams extends Partial<RenderPassOptions> {}

/**
 * Used by {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget} and the {@link Renderer} to render to one or multiple {@link RenderPass#viewTextures | view textures} (and optionally a {@link RenderPass#depthTexture | depth texture}), using a specific {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#descriptor | GPURenderPassDescriptor}.
 */
export class RenderPass {
  /** {@link Renderer} used by this {@link RenderPass}. */
  renderer: Renderer
  /** The type of the {@link RenderPass}. */
  type: string
  /** The universal unique id of this {@link RenderPass}. */
  readonly uuid: string

  /** Options used to create this {@link RenderPass}. */
  options: RenderPassOptions

  /** Depth {@link Texture} to use with this {@link RenderPass} if it should handle depth .*/
  depthTexture: Texture | undefined

  /** Array of {@link Texture} used for this {@link RenderPass} color attachments view textures. */
  viewTextures: Texture[]

  /** Array of {@link Texture} used for this {@link RenderPass} color attachments resolve textures. */
  resolveTargets: Array<null | Texture>

  /** The {@link RenderPass} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#descriptor | GPURenderPassDescriptor}. */
  descriptor: GPURenderPassDescriptor

  /** Viewport to set to the {@link GPURenderPassEncoder} if any. */
  viewport: RenderPassViewport | null

  /** Scissor {@link RectBBox} to use for scissors if any. */
  scissorRect: RectBBox | null

  /** Whether the {@link RenderPass} should handle stencil. Default to `false`, eventually set to `true` based on the {@link depthTexture} format. */
  #useStencil: boolean

  /**
   * RenderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
   * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}.
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    {
      label = 'Render Pass',
      sampleCount = 4,
      qualityRatio = 1,
      fixedSize = null,
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
      depthReadOnly = false,
      stencilClearValue = 0,
      stencilLoadOp = 'clear' as GPULoadOp,
      stencilStoreOp = 'store' as GPUStoreOp,
      stencilReadOnly = false,
    } = {} as RenderPassParams
  ) {
    this.type = 'RenderPass'

    renderer = isRenderer(renderer, label + ' ' + this.type)
    this.renderer = renderer

    this.uuid = generateUUID()

    this.viewport = null
    this.scissorRect = null

    this.#useStencil = false

    if (useColorAttachments) {
      const defaultColorAttachment = {
        loadOp: 'clear' as GPULoadOp,
        storeOp: 'store' as GPUStoreOp,
        clearValue: [0, 0, 0, 0] as GPUColor,
        targetFormat: this.renderer.options.context.format,
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
      fixedSize,
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
      depthReadOnly,
      stencilClearValue,
      stencilLoadOp,
      stencilStoreOp,
      stencilReadOnly,
    }

    this.renderer.renderPasses.set(this.uuid, this)

    if (this.renderer.device) {
      this.init()
    }
  }

  /**
   * Initialize the {@link RenderPass} textures and descriptor.
   */
  init() {
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
   * Reset this {@link RenderPass} {@link RenderPass.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    if (this.renderer) {
      this.renderer.renderPasses.delete(this.uuid)
    }

    renderer = isRenderer(renderer, this.options.label + ' ' + this.type)
    this.renderer = renderer

    if (this.options.useDepth && !this.options.depthTexture) {
      this.depthTexture.setRenderer(this.renderer)
    }

    this.viewTextures.forEach((texture) => {
      texture.setRenderer(this.renderer)
    })

    this.resolveTargets.forEach((texture) => {
      if (texture) {
        texture.setRenderer(this.renderer)
      }
    })

    this.renderer.renderPasses.set(this.uuid, this)
  }

  /**
   * Create and set our {@link depthTexture | depth texture}.
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
        ...(this.options.fixedSize && { fixedSize: this.options.fixedSize }),
        type: 'depth',
        usage: ['renderAttachment', 'textureBinding'],
      })
    }

    if (this.depthTexture.options.format.includes('stencil')) {
      this.#useStencil = true
    }
  }

  /**
   * Create and set our {@link viewTextures | view textures}.
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
          ...(this.options.fixedSize && { fixedSize: this.options.fixedSize }),
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
   * @readonly
   */
  get outputTextures(): Texture[] {
    return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures
  }

  /**
   * Set our render pass {@link descriptor}.
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
          // eventual depth slice
          ...(colorAttachment.depthSlice !== undefined && {
            depthSlice: colorAttachment.depthSlice,
          }),
        }
      }),
      ...(this.options.useDepth && {
        depthStencilAttachment: {
          view:
            depthTextureView ||
            this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + ' view',
            }),
          ...this.depthStencilAttachmentSettings,
        },
      }),
    }
  }

  /**
   * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
   * @readonly
   */
  get depthStencilAttachmentSettings(): Omit<GPURenderPassDescriptor['depthStencilAttachment'], 'view'> {
    const depthReadOnly = !!this.options.depthReadOnly
    const stencilReadOnly = !!this.options.stencilReadOnly

    return {
      depthClearValue: this.options.depthClearValue,
      // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
      ...(!depthReadOnly && { depthLoadOp: this.options.depthLoadOp, depthStoreOp: this.options.depthStoreOp }),
      depthReadOnly,
      ...(this.#useStencil && {
        ...(!stencilReadOnly && {
          stencilLoadOp: this.options.stencilLoadOp,
          stencilStoreOp: this.options.stencilStoreOp,
        }),
        stencilReadOnly,
      }),
    }
  }

  /**
   * Update the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
   * @private
   */
  #updateDepthAttachmentSettings() {
    if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
      this.descriptor.depthStencilAttachment = {
        view: this.descriptor.depthStencilAttachment.view,
        ...this.depthStencilAttachmentSettings,
      }
    }
  }

  /**
   * Set the {@link viewport} to use if any.
   * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
   */
  setViewport(viewport: RenderPassViewport | null = null) {
    this.viewport = viewport
  }

  /**
   * Set the {@link scissorRect} to use if any.
   * @param scissorRect - {@link RectBBox} size to use for scissors. Can be set to `null` to cancel the {@link scissorRect}.
   */
  setScissorRect(scissorRect: RectBBox | null = null) {
    this.scissorRect = scissorRect
  }

  /**
   * Begin the {@link GPURenderPassEncoder} and eventually set the {@link viewport} and {@link scissorRect}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   * @param descriptor - Custom {@link https://gpuweb.github.io/types/interfaces/GPURenderPassDescriptor.html | GPURenderPassDescriptor} to use if any. Default to {@link RenderPass#descriptor | descriptor}.
   * @returns - The created {@link GPURenderPassEncoder}.
   */
  beginRenderPass(commandEncoder: GPUCommandEncoder, descriptor = this.descriptor): GPURenderPassEncoder {
    const pass = commandEncoder.beginRenderPass(descriptor)

    if (this.viewport) {
      pass.setViewport(
        this.viewport.left,
        this.viewport.top,
        this.viewport.width,
        this.viewport.height,
        this.viewport.minDepth,
        this.viewport.maxDepth
      )
    }

    if (this.scissorRect) {
      pass.setScissorRect(this.scissorRect.left, this.scissorRect.top, this.scissorRect.width, this.scissorRect.height)
    }

    return pass
  }

  /**
   * Update our {@link RenderPass} textures quality ratio.
   * @param qualityRatio - New quality ratio to use.
   */
  setQualityRatio(qualityRatio = 1) {
    if (this.options.qualityRatio === qualityRatio) return

    this.options.qualityRatio = qualityRatio

    // view textures, resolve targets and eventual depth texture
    this.viewTextures.forEach((viewTexture) => {
      viewTexture.setQualityRatio(this.options.qualityRatio)
    })

    this.resolveTargets.forEach((resolveTarget) => {
      resolveTarget?.setQualityRatio(this.options.qualityRatio)
    })

    if (!this.options.depthTexture && this.options.useDepth) {
      this.depthTexture.setQualityRatio(this.options.qualityRatio)
    }

    // then resize
    this.resize()
  }

  /**
   * Resize our {@link RenderPass}: reset its {@link Texture}.
   */
  resize() {
    if (!this.renderer.device) return

    // reassign textures
    // they have actually been resized beforehand by the renderer
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
   * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation}.
   * @param loadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to use.
   * @param colorAttachmentIndex - index of the color attachment for which to use this load operation.
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
   * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation}.
   * @param depthLoadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to use.
   */
  setDepthLoadOp(depthLoadOp: GPULoadOp = 'clear') {
    this.options.depthLoadOp = depthLoadOp
    this.#updateDepthAttachmentSettings()
  }

  /**
   * Set the new {@link RenderPassParams.depthReadOnly | depthReadOnly} setting.
   * @param value - Whether the depth buffer should be read-only or not.
   */
  setDepthReadOnly(value: boolean) {
    this.options.depthReadOnly = value
    this.#updateDepthAttachmentSettings()
  }

  /**
   * Set the new {@link RenderPassParams.stencilReadOnly | stencilReadOnly} setting.
   * @param value - Whether the stencil buffer should be read-only or not.
   */
  setStencilReadOnly(value: boolean) {
    this.options.stencilReadOnly = value
    this.#updateDepthAttachmentSettings()
  }

  /**
   * Set our {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value}.<br>
   * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURendererContextOptions#alphaMode | premultiplied alpha mode}, your `R`, `G` and `B` channels should be premultiplied by your alpha channel.
   * @param clearValue - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value} to use.
   * @param colorAttachmentIndex - index of the color attachment for which to use this clear value.
   */
  setClearValue(clearValue: GPUColor = [0, 0, 0, 0], colorAttachmentIndex = 0) {
    if (this.options.useColorAttachments) {
      if (this.renderer.options.context.alphaMode === 'premultiplied') {
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
   * Set the current {@link descriptor} texture {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#view | view} and {@link GPUCommandEncoder.beginRenderPass().resolveTarget | resolveTarget} (depending on whether we're using multisampling).
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
   * Destroy our {@link RenderPass}.
   */
  destroy() {
    this.viewTextures.forEach((viewTexture) => viewTexture.destroy())
    this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy())

    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy()
    }

    this.renderer.renderPasses.delete(this.uuid)
  }
}
