import { MaterialShadersType } from '../materials/Material'

export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler'

export interface BindingsParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: MaterialShadersType | null
}

// export class Bindings {
//   label: string
//   name: string
//   bindingType: BindingType
//   bindIndex: number
//   visibility: GPUShaderStageFlags
//   value?: Float32Array | null
//
//   constructor({ label, name, bindingType, bindIndex, visibility }: BindingsParams)
//
//   setWGSLFragment()
//   shouldUpdateUniform()
//   onBeforeRender()
// }
