import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture, RenderTextureParams } from './RenderTexture'
import { RectSize } from '../DOM/DOMElement'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { TextureBinding, TextureBindingParams } from '../bindings/TextureBinding'
import { BindingMemoryAccessType } from '../bindings/Binding'

/**
 * Parameters used to create a {@link StorageTexture}
 */
export interface StorageTextureParams {
  /** The label of the {@link StorageTexture}, used to create various GPU objects for debugging purpose */
  label?: string
  /** Name of the {@link StorageTexture} to use in the [binding]{@link TextureBinding} */
  name?: string
  /** Size of the [texture]{@link StorageTexture#texture} */
  size?: RectSize
  format?: GPUTextureFormat
  access?: BindingMemoryAccessType
}

/** @const - default {@link RenderTexture} parameters */
const defaultStorageTextureParams: StorageTextureParams = {
  label: 'StorageTexture',
  name: 'storageTexture',
  size: {
    width: 1,
    height: 1,
  },
  format: 'rgba8unorm',
  access: 'write',
}

/**
 * StorageTexture class:
 * Used to create [textures]{@link GPUTexture} that can be used as storage textures, i.e. textures that can be written/read
 */
export class StorageTexture {
  /** [renderer]{@link Renderer} used by this {@link StorageTexture} */
  renderer: Renderer
  /** The type of the {@link StorageTexture} */
  type: string

  /** The {@link GPUTexture} used */
  texture: GPUTexture

  /** Size of the [texture]{@link StorageTexture#texture} */
  size: RectSize

  /** Options used to create this {@link StorageTexture} */
  options: StorageTextureParams

  /** Array of [bindings]{@link Binding} that will actually only hold one [texture binding]{@link TextureBinding} */
  bindings: BindGroupBindingElement[]

  constructor(renderer: Renderer | GPUCurtains, parameters = defaultStorageTextureParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' StorageTexture' : 'StorageTexture')

    this.type = 'StorageTexture'

    this.options = { ...defaultStorageTextureParams, ...parameters }
    this.size = this.options.size

    // texture
    this.createTexture()

    // bindings
    this.setBindings()
  }

  /**
   * Create the [texture]{@link GPUTexture}
   */
  createTexture() {
    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.renderer.preferredFormat,
      size: [this.size.width, this.size.height],
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    })
  }

  /**
   * Set our [bindings]{@link StorageTexture#bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ': ' + this.options.name + ' storage texture',
        name: this.options.name,
        texture: this.texture,
        bindingType: 'storageTexture',
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
}
