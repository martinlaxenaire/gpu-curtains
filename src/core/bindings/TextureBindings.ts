import { Bindings, BindingsParams, BindingType } from './Bindings'

/** Defines a {@link TextureBindings} [resource]{@link TextureBindings#resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null
//export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

/**
 * An object defining all possible {@link TextureBindings} class instancing parameters
 */
export interface TextureBindingsParams extends BindingsParams {
  /** {@link TextureBindings} [resource]{@link TextureBindings#resource} */
  resource: TextureBindingResource
}

/**
 * TextureBindings class:
 * Used to handle GPUTexture and GPUExternalTexture bindings
 * @extends Bindings
 */
export class TextureBindings extends Bindings {
  /** Our {@link TextureBindings} resource, i.e. a {@link GPUTexture} or {@link GPUExternalTexture} */
  resource: TextureBindingResource
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link TextureBindings} */
  wgslGroupFragment: string[]

  /**
   * TextureBindings constructor
   * @param {TextureBindingsParams} parameters - parameters used to create our TextureBindings
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
    resource,
    bindingType,
    bindIndex = 0,
    visibility,
  }: TextureBindingsParams) {
    bindingType = bindingType ?? 'texture'

    super({ label, name, bindingType, bindIndex, visibility })

    this.resource = resource // should be a texture or an external texture

    this.setWGSLFragment()
  }

  /**
   * Set or update our [bindingType]{@link Bindings#bindingType} and our WGSL code snippet
   * @param bindingType - the new [binding type]{@link Bindings#bindingType}
   */
  setBindingType(bindingType: BindingType) {
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
