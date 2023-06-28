import { ShadersType } from '../meshes/MeshBaseMixin'

export type BindingType = 'uniform' | 'storage' | 'texture' | 'externalTexture' | 'sampler'

interface BindingsParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: ShadersType | null
}

export class Bindings {
  label: string
  name: string
  bindingType: BindingType
  bindIndex: number
  visibility: GPUShaderStageFlags
  value?: Float32Array | null

  constructor({ label, name, bindingType, bindIndex, visibility }: BindingsParams)

  setWGSLFragment()
  shouldUpdateUniform()
  onBeforeRender()
}
