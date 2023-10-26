import { BindingsParams } from './Bindings'

export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

export interface TextureBindingsParams extends BindingsParams {
  resource: TextureBindingResource
}
