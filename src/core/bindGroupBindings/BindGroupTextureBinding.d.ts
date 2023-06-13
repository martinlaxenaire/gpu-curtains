import { BindGroupBinding, BindGroupBindingParams } from './BindGroupBinding'

type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

interface BindGroupTextureBindingParams extends BindGroupBindingParams {
  resource: TextureBindingResource
}

export class BindGroupTextureBinding extends BindGroupBinding {
  resource: TextureBindingResource
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, resource, visibility }: BindGroupTextureBindingParams)
}
