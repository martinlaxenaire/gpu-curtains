import { toCamelCase } from '../../utils/utils.mjs';
import { getBindingVisibility } from './utils.mjs';

class Binding {
  /**
   * Binding constructor
   * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}
   */
  constructor({
    label = "Uniform",
    name = "uniform",
    bindingType = "uniform",
    visibility = ["vertex", "fragment", "compute"]
  }) {
    this.label = label;
    this.name = toCamelCase(name);
    this.bindingType = bindingType;
    this.visibility = getBindingVisibility(visibility);
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
