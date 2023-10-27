import { BindingsParams } from './Bindings'

export type TextureBindingResource = GPUTexture | GPUExternalTexture | null
//export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

export interface TextureBindingsParams extends BindingsParams {
  resource: TextureBindingResource
}
