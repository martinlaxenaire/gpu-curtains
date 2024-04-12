import { toCamelCase } from '../../utils/utils.mjs';

class Binding {
  /**
   * Binding constructor
   * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}
   */
  constructor({ label = "Uniform", name = "uniform", bindingType = "uniform", visibility = "all" }) {
    this.label = label;
    this.name = toCamelCase(name);
    this.bindingType = bindingType;
    this.visibility = visibility ? (() => {
      switch (visibility) {
        case "vertex":
          return GPUShaderStage.VERTEX;
        case "fragment":
          return GPUShaderStage.FRAGMENT;
        case "compute":
          return GPUShaderStage.COMPUTE;
        case "all":
        default:
          return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
      }
    })() : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
    this.options = {
      label,
      name,
      bindingType,
      visibility
    };
    this.shouldResetBindGroup = false;
    this.shouldResetBindGroupLayout = false;
    this.cacheKey = `${bindingType},${visibility},`;
  }
}

export { Binding };
