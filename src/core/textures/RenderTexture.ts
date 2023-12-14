import { isRenderer, Renderer } from '../renderers/utils'
import { TextureBinding, TextureBindingParams } from '../bindings/TextureBinding'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RectSize } from '../DOM/DOMElement'
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding'
import { generateUUID } from '../../utils/utils'
import { Texture } from './Texture'
import { TextureSize } from '../../types/Textures'

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
  size?: TextureSize
  /** Whether to use this [texture]{@link RenderTexture} as a regular or storage texture */
  usage?: RenderTextureBindingType
  /** Optional format of the [texture]{@link RenderTexture#texture}, mainly used for storage textures */
  format?: GPUTextureFormat
  /** Optional texture binding memory access type, mainly used for storage textures */
  access?: BindingMemoryAccessType
  /** Optional [texture]{@link RenderTexture#texture} view dimension to use */
  viewDimension?: GPUTextureViewDimension
}

/**
 * Parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureParams extends RenderTextureBaseParams {
  /** Optional texture to use as a copy source input. Could be a {@link RenderTexture} or {@link Texture} */
  fromTexture?: RenderTexture | Texture | null
}

/** @const - default {@link RenderTexture} parameters */
const defaultRenderTextureParams: RenderTextureParams = {
  label: 'RenderTexture',
  name: 'renderTexture',
  usage: 'texture',
  access: 'write',
  fromTexture: null,
  viewDimension: '2d',
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
  /** The universal unique id of this {@link RenderTexture} */
  readonly uuid: string

  /** The {@link GPUTexture} used */
  texture: GPUTexture

  /** Size of the [texture]{@link RenderTexture#texture} source, usually our [renderer pixel ratio bounding rect]{@link Renderer#pixelRatioBoundingRect} */
  size: TextureSize

  /** Options used to create this {@link RenderTexture} */
  options: RenderTextureParams

  /** Array of [struct]{@link Binding} that will actually only hold one [texture binding]{@link TextureBinding} */
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

    this.uuid = generateUUID()

    this.options = { ...defaultRenderTextureParams, ...parameters }

    if (!this.options.format) {
      this.options.format = this.renderer.preferredFormat
    }

    this.shouldUpdateBindGroup = false

    // sizes
    this.setSize(this.options.size)

    // struct
    this.setBindings()

    // texture
    this.createTexture()
  }

  /**
   * Set the [size]{@link RenderTexture#size}
   * @param size - [size]{@link TextureSize} to set, the [renderer bounding rectangle]{@link Renderer#pixelRatioBoundingRect} width and height and 1 for depth if null
   */
  setSize(size: TextureSize | null = null) {
    if (!size) {
      size = {
        width: this.renderer.pixelRatioBoundingRect.width,
        height: this.renderer.pixelRatioBoundingRect.height,
        depth: 1,
      }
    }

    this.size = size
  }

  /**
   * Copy another {@link RenderTexture} into this {@link RenderTexture}
   * @param texture - {@link RenderTexture} to copy
   */
  copy(texture: RenderTexture | Texture) {
    this.options.fromTexture = texture
    this.createTexture()
  }

  /**
   * Create the [texture]{@link GPUTexture} (or copy it from source) and update the [binding resource]{@link TextureBinding#resource}
   */
  createTexture() {
    if (this.options.fromTexture) {
      // update size
      this.size = this.options.fromTexture.size
      // just copy the original GPUTexture and update the binding
      this.texture = this.options.fromTexture.texture
      this.textureBinding.resource = this.texture
      return
    }

    this.texture?.destroy()

    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth],
      dimensions: this.options.viewDimension === '1d' ? '1d' : this.options.viewDimension === '3d' ? '3d' : '2d',
      usage:
        // TODO let user chose?
        // see https://matrix.to/#/!MFogdGJfnZLrDmgkBN:matrix.org/$vESU70SeCkcsrJQdyQGMWBtCgVd3XqnHcBxFDKTKKSQ?via=matrix.org&via=mozilla.org&via=hej.im
        this.options.usage === 'texture'
          ? GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT
          : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    } as GPUTextureDescriptor)

    // update texture binding
    this.textureBinding.resource = this.texture
  }

  /**
   * Set our [struct]{@link RenderTexture#bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ': ' + this.options.name + ' render texture',
        name: this.options.name,
        texture: this.texture,
        bindingType: this.options.usage,
        viewDimension: this.options.viewDimension,
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
    // destroy the GPU texture only if it's not a copy of another texture
    if (!this.options.fromTexture) {
      this.texture?.destroy()
    }

    this.texture = null
  }
}
