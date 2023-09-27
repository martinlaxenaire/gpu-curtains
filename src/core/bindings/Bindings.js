import { toCamelCase } from '../../utils/utils'

export class Bindings {
  constructor({ label = 'Uniform', name = 'uniform', bindingType = 'uniform', bindIndex = 0, visibility }) {
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
              return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
          }
        })()
      : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
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
