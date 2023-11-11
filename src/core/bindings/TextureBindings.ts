import { Bindings, BindingsParams, BindingType } from './Bindings'

/** Defines a {@link TextureBindings} [resource]{@link TextureBindings#resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null

//export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

/**
 * An object defining all possible {@link TextureBindings} class instancing parameters
 */
export interface TextureBindingsParams extends BindingsParams {
  /** {@link TextureBindings} [resource]{@link TextureBindings#resource} */
  texture: TextureBindingResource
}

/**
 * TextureBindings class:
 * Used to handle GPUTexture and GPUExternalTexture bindings
 * @extends Bindings
 */
export class TextureBindings extends Bindings {
  /** Our {@link TextureBindings} resource, i.e. a {@link GPUTexture} or {@link GPUExternalTexture} */
  texture: TextureBindingResource
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link TextureBindings} */
  wgslGroupFragment: string[]

  /**
   * TextureBindings constructor
   * @param parameters - parameters used to create our TextureBindings
   * @param {string=} parameters.label - binding label
   * @param {string=} parameters.name - binding name
   * @param {BindingType="uniform"} parameters.bindingType - binding type
   * @param {number=} parameters.bindIndex - bind index inside the bind group
   * @param {MaterialShadersType=} parameters.visibility - shader visibility
   * @param {TextureBindingResource=} parameters.resource - a GPUTexture or GPUExternalTexture
   */
  constructor({
    label = 'Texture',
    name = 'texture',
    texture,
    bindingType,
    bindIndex = 0,
    visibility,
  }: TextureBindingsParams) {
    bindingType = bindingType ?? 'texture'

    super({ label, name, bindingType, bindIndex, visibility })

    this.resource = texture // should be a texture or an external texture

    this.setWGSLFragment()
  }

  /**
   * Get bind group layout entry resource, either for [texture]{@link GPUBindGroupLayoutEntry#texture} or [externalTexture]{@link GPUBindGroupLayoutEntry#externalTexture}
   */
  get resourceLayout(): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | null {
    return this.texture instanceof GPUExternalTexture
      ? { externalTexture: {} }
      : this.texture instanceof GPUTexture
      ? { texture: {} } // TODO?
      : null
  }

  /**
   * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
   */
  get resource(): GPUExternalTexture | GPUTextureView | null {
    return this.texture instanceof GPUExternalTexture
      ? this.texture
      : this.texture instanceof GPUTexture
      ? this.texture.createView()
      : null
  }

  set resource(value: TextureBindingResource) {
    this.texture = value
  }

  /**
   * Set or update our [bindingType]{@link Bindings#bindingType} and our WGSL code snippet
   * @param bindingType - the new [binding type]{@link Bindings#bindingType}
   */
  setBindingType(bindingType: BindingType) {
    // TODO if the binding type change (probably switching from 'texture' to 'externalTexture'), maybe we should tell the parent bind group to reset from here?
    if (bindingType !== this.bindingType) {
      this.bindingType = bindingType
      this.setWGSLFragment()
    }
  }

  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [
      this.bindingType === 'externalTexture'
        ? `var ${this.name}: texture_external;`
        : `var ${this.name}: texture_2d<f32>;`,
    ]
  }
}
