import { Bindings, BindingsParams } from './Bindings'

type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

interface TextureBindingsParams extends BindingsParams {
  resource: TextureBindingResource
}

export class TextureBindings extends Bindings {
  resource: TextureBindingResource
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, resource, visibility }: TextureBindingsParams)
}
