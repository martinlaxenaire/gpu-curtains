import { Bindings, BindingsParams, BindingType } from './Bindings'

export type TextureBindingResource = GPUTexture | GPUExternalTexture | null
//export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

export interface TextureBindingsParams extends BindingsParams {
  resource: TextureBindingResource
}

/**
 * TextureBindings class:
 * Used to handle GPUTexture and GPUExternalTexture bindings
 * @extends Bindings
 */
export class TextureBindings extends Bindings {
  resource: TextureBindingResource
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
   * Set or update our binding type and our WGSL code snippet
   * @param {BindingType} bindingType - the new binding type
   */
  setBindingType(bindingType: BindingType) {
    this.bindingType = bindingType
    this.setWGSLFragment()
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
