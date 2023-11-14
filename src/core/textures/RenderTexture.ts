import { isRenderer, Renderer } from '../renderers/utils'
import { TextureBinding, TextureBindingParams } from '../bindings/TextureBinding'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RectSize } from '../DOM/DOMElement'
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding'

export type RenderTextureBindingType = Exclude<TextureBindingType, 'externalTexture'>

/**
 * Base parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureBaseParams {
  /** The label of the {@link RenderTexture}, used to create various GPU objects for debugging purpose */
  label?: string
  /** Name of the {@link RenderTexture} to use in the [binding]{@link TextureBinding} */
  name?: string

  /** Optional size of the [texture]{@link RenderTexture#texture} */
  size?: RectSize
  /** Whether to use this [texture]{@link RenderTexture} as a regular or storage texture */
  usage?: RenderTextureBindingType
  /** Optional format of the [texture]{@link RenderTexture#texture}, mainly used for storage textures */
  format?: GPUTextureFormat
  /** Optional texture binding memory access type, mainly used for storage textures */
  access?: BindingMemoryAccessType
}

/**
 * Parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureParams extends RenderTextureBaseParams {
  /** Optional {@link RenderTexture} to use as a copy source input */
  fromTexture?: RenderTexture | null
}

/** @const - default {@link RenderTexture} parameters */
const defaultRenderTextureParams: RenderTextureParams = {
  label: 'RenderTexture',
  name: 'renderTexture',
  usage: 'texture',
  access: 'write',
  fromTexture: null,
}

/**
 * RenderTexture class:
 * Used to create [textures]{@link GPUTexture} that can be used as copy source/destination for [render passes]{@link RenderPass} and [render targets]{@link RenderTarget}.
 * Basically useful for copying anything outputed to the screen at one point or another.
 */
export class RenderTexture {
  /** [renderer]{@link Renderer} used by this {@link RenderTexture} */
  renderer: Renderer
  /** The type of the {@link RenderTexture} */
  type: string

  /** The {@link GPUTexture} used */
  texture: GPUTexture

  /** Size of the [texture]{@link RenderTexture#texture} source, usually our [renderer pixel ratio bounding rect]{@link Renderer#pixelRatioBoundingRect} */
  size: RectSize

  /** Options used to create this {@link RenderTexture} */
  options: RenderTextureParams

  /** Array of [bindings]{@link Binding} that will actually only hold one [texture binding]{@link TextureBinding} */
  bindings: BindGroupBindingElement[]
  /** Whether to update the [bind group]{@link BindGroup} to which the [texture binding]{@link TextureBinding} belongs */
  shouldUpdateBindGroup: boolean

  /**
   * RenderTexture constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - [parameters]{@link RenderTextureParams} used to create this {@link RenderTexture}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = defaultRenderTextureParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' RenderTexture' : 'RenderTexture')

    this.type = 'RenderTexture'

    this.renderer = renderer

    this.options = { ...defaultRenderTextureParams, ...parameters }

    if (!this.options.format) {
      this.options.format = this.renderer.preferredFormat
    }

    this.shouldUpdateBindGroup = false

    // sizes
    this.setSize(this.options.size)

    // bindings
    this.setBindings()

    // texture
    this.createTexture()
  }

  /**
   * Set the [size]{@link RenderTexture#size}
   * @param size - [size]{@link RectSize} to set, the [renderer bounding rectangle]{@link Renderer#pixelRatioBoundingRect} width and height if null
   */
  setSize(size: RectSize | null = null) {
    if (!size) {
      size = {
        width: this.renderer.pixelRatioBoundingRect.width,
        height: this.renderer.pixelRatioBoundingRect.height,
      }
    }

    this.size = size
  }

  /**
   * Create the [texture]{@link GPUTexture} (or copy it from source) and update the [binding resource]{@link TextureBinding#resource}
   */
  createTexture() {
    if (this.options.fromTexture) {
      // just copy the original GPUTexture
      this.texture = this.options.fromTexture.texture
      this.size = this.options.fromTexture.size
      // update texture binding
      this.textureBinding.resource = this.texture
      return
    }

    this.texture?.destroy()

    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height],
      usage:
        this.options.usage === 'texture'
          ? GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT
          : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST, // TODO let user chose?
    })

    // update texture binding
    this.textureBinding.resource = this.texture
  }

  /**
   * Set our [bindings]{@link RenderTexture#bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ': ' + this.options.name + ' render texture',
        name: this.options.name,
        texture: this.texture,
        bindingType: this.options.usage,
      } as TextureBindingParams),
    ]
  }

  /**
   * Get our [texture binding]{@link TextureBinding}
   * @readonly
   */
  get textureBinding(): TextureBinding {
    return this.bindings[0] as TextureBinding
  }

  /**
   * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the [bind group]{@link BindGroup} to update
   * @param size - the optional new [size]{@link RectSize} to set
   */
  resize(size: RectSize | null = null) {
    this.setSize(size)

    this.createTexture()
    this.shouldUpdateBindGroup = true
  }

  /**
   * Destroy our {@link RenderTexture}
   */
  destroy() {
    this.texture?.destroy()
    this.texture = null
  }
}
