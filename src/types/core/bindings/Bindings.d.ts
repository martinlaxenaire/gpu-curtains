import { MaterialShadersType } from '../materials/Material'

export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler'

export interface BindingsParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: MaterialShadersType | null
}
