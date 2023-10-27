import { toCamelCase } from '../../utils/utils'
import { BindingsParams, BindingType } from '../../types/core/bindings/Bindings'

export class Bindings {
  label: string
  name: string
  bindingType: BindingType
  bindIndex: number
  visibility: GPUShaderStageFlags
  value?: Float32Array | null

  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType = 'uniform',
    bindIndex = 0,
    visibility,
  }: BindingsParams) {
    this.label = label
    this.name = toCamelCase(name)
    this.bindingType = bindingType
    this.bindIndex = bindIndex

    this.visibility = visibility
      ? (() => {
          switch (visibility) {
            case 'vertex':
              return GPUShaderStage.VERTEX
            case 'fragment':
              return GPUShaderStage.FRAGMENT
            case 'compute':
              return GPUShaderStage.COMPUTE
            default:
              return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
          }
        })()
      : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  }

  setWGSLFragment() {
    /* will be overridden */
  }

  shouldUpdateUniform() {
    /* will be overridden */
  }

  onBeforeRender() {
    /* will be overridden */
  }
}
