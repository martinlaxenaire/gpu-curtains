export class BindGroupBinding {
  constructor({ label = 'Uniform', name = 'uniform', bindingType = 'uniform', bindIndex = 0, visibility }) {
    this.label = label
    this.name = name
    this.bindingType = bindingType
    this.bindIndex = bindIndex
    this.visibility = visibility
      ? (() => {
          switch (visibility) {
            case 'vertex':
              return GPUShaderStage.VERTEX
            case 'fragment':
              return GPUShaderStage.FRAGMENT
            default:
              return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
          }
        })()
      : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  }

  setWGSLFragment() {}

  shouldUpdateUniform(uniformName = '') {}

  onBeforeRender() {}
}
