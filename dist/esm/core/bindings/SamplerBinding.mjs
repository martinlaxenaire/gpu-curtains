import { Binding } from './Binding.mjs';

class SamplerBinding extends Binding {
  /**
   * SamplerBinding constructor
   * @param parameters - {@link SamplerBindingParams | parameters} used to create our SamplerBindings
   */
  constructor({
    label = "Sampler",
    name = "sampler",
    bindingType,
    visibility,
    sampler,
    type = "filtering"
  }) {
    bindingType = bindingType ?? "sampler";
    super({ label, name, bindingType, visibility });
    this.options = {
      ...this.options,
      sampler,
      type
    };
    this.resource = sampler;
    this.setWGSLFragment();
  }
  /**
   * Get {@link GPUBindGroupLayoutEntry#sampler | bind group layout entry resource}
   * @readonly
   */
  get resourceLayout() {
    return {
      sampler: {
        type: this.options.type
        // TODO set shouldResetBindGroupLayout to true if it changes afterwards
      }
    };
  }
  /**
   * Get the {@link GPUBindGroupEntry#resource | bind group resource}
   */
  get resource() {
    return this.sampler;
  }
  /**
   * Set the {@link GPUBindGroupEntry#resource | bind group resource}
   * @param value - new bind group resource
   */
  set resource(value) {
    if (value && this.sampler)
      this.shouldResetBindGroup = true;
    this.sampler = value;
  }
  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [
      `var ${this.name}: ${this.options.type === "comparison" ? `${this.bindingType}_comparison` : this.bindingType};`
    ];
  }
}

export { SamplerBinding };
