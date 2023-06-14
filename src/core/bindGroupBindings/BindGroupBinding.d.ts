import { ShadersType } from '../meshes/Mesh'

// TODO ugly fix so typescript does not complain about BindingType being a string
type BindingType = 'uniform' | 'storage' | 'texture' | 'externalTexture' | 'sampler' | string

interface BindGroupBindingParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: ShadersType | null
}

export class BindGroupBinding {
  label: string
  name: string
  bindingType: BindingType
  bindIndex: number
  visibility: GPUShaderStageFlags
  value?: Float32Array | null

  constructor({ label, name, bindingType, bindIndex, visibility }: BindGroupBindingParams)

  setWGSLFragment()
  shouldUpdateUniform()
  onBeforeRender()
}
