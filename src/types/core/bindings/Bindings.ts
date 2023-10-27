import { MaterialShadersType } from '../materials/Material'
import { TextureBindings } from '../../../core/bindings/TextureBindings'
import { SamplerBindings } from '../../../core/bindings/SamplerBindings'

export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler'

export type TextureSamplerBindings = TextureBindings | SamplerBindings

export interface BindingsParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: MaterialShadersType | null
}
