import { Binding, BindingMemoryAccessType, BindingParams, BindingType } from './Binding'
import { getBindGroupLayoutTextureBindingType, getTextureBindingWGSLVarType } from './utils'

/** Defines a {@link TextureBinding} [resource]{@link TextureBinding#resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null

/**
 * An object defining all possible {@link TextureBinding} class instancing parameters
 */
export interface TextureBindingParams extends BindingParams {
  /** {@link TextureBinding} [resource]{@link TextureBinding#resource} */
  texture: TextureBindingResource
  /** The [texture]{@link GPUTexture} format to use */
  format?: GPUTextureFormat
  /** The storage [texture]{@link GPUTexture} binding memory access types (read only, write only or read/write) */
  access?: BindingMemoryAccessType
  /** The [texture]{@link GPUTexture} view dimension to use */
  viewDimension?: GPUTextureViewDimension
}

/**
 * TextureBinding class:
 * Used to handle GPUTexture and GPUExternalTexture struct
 * @extends Binding
 */
export class TextureBinding extends Binding {
  /** Our {@link TextureBinding} resource, i.e. a {@link GPUTexture} or {@link GPUExternalTexture} */
  texture: TextureBindingResource
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link TextureBinding} */
  wgslGroupFragment: string[]
  /** Options used to create this {@link TextureBinding} */
  options: TextureBindingParams

  /**
   * TextureBinding constructor
   * @param parameters - [parameters]{@link TextureBindingParams} used to create our {@link TextureBinding}
   */
  constructor({
    label = 'Texture',
    name = 'texture',
    bindingType,
    visibility,
    texture,
    format = 'rgba8unorm',
    access = 'write',
    viewDimension = '2d',
  }: TextureBindingParams) {
    bindingType = bindingType ?? 'texture'

    if (bindingType === 'storageTexture') {
      visibility = 'compute'
    }

    super({ label, name, bindingType, visibility })

    this.options = {
      ...this.options,
      texture,
      format,
      access,
      viewDimension,
    }

    this.resource = texture // should be a texture or an external texture

    this.setWGSLFragment()
  }

  /**
   * Get bind group layout entry resource, either for [texture]{@link GPUBindGroupLayoutEntry#texture} or [externalTexture]{@link GPUBindGroupLayoutEntry#externalTexture}
   */
  get resourceLayout():
    | GPUTextureBindingLayout
    | GPUExternalTextureBindingLayout
    | GPUStorageTextureBindingLayout
    | null {
    return getBindGroupLayoutTextureBindingType(this)
  }

  /**
   * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
   */
  get resource(): GPUExternalTexture | GPUTextureView | null {
    return this.texture instanceof GPUTexture
      ? this.texture.createView({ label: this.options.label + ' view' })
      : this.texture instanceof GPUExternalTexture
      ? this.texture
      : null
  }

  set resource(value: TextureBindingResource) {
    // resource changed, update bind group!
    if (value || this.texture) this.shouldResetBindGroup = true
    this.texture = value
  }

  /**
   * Set or update our [bindingType]{@link Binding#bindingType} and our WGSL code snippet
   * @param bindingType - the new [binding type]{@link Binding#bindingType}
   */
  setBindingType(bindingType: BindingType) {
    if (bindingType !== this.bindingType) {
      // binding type has changed!
      if (bindingType) this.shouldResetBindGroupLayout = true

      this.bindingType = bindingType
      this.setWGSLFragment()
    }
  }

  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [`${getTextureBindingWGSLVarType(this)}`]
  }
}
