import { ShadersType } from '../meshes/Mesh'

type BindingType = 'uniform' | 'storage' | 'texture' | 'externalTexture' | 'sampler'

interface BindGroupBindingProps {
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

  constructor({ label, name, bindingType, bindIndex, visibility }: BindGroupBindingProps)

  setWGSLFragment()
  shouldUpdateUniform()
  onBeforeRender()
}
