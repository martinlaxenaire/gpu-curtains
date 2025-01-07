import { isRenderer } from '../renderers/utils.mjs';
import { SamplerBinding } from '../bindings/SamplerBinding.mjs';
import { generateUUID, throwWarning } from '../../utils/utils.mjs';

class Sampler {
  /**
   * Sampler constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}.
   * @param parameters - {@link SamplerParams | parameters} used to create this {@link Sampler}.
   */
  constructor(renderer, {
    label = "Sampler",
    name,
    addressModeU = "repeat",
    addressModeV = "repeat",
    magFilter = "linear",
    minFilter = "linear",
    mipmapFilter = "linear",
    maxAnisotropy = 1,
    type = "filtering",
    compare = null
  } = {}) {
    this.type = "Sampler";
    this.uuid = generateUUID();
    renderer = isRenderer(renderer, label ? label + " " + this.type : this.type);
    this.renderer = renderer;
    this.label = label;
    if (!name && !this.renderer.production) {
      name = "sampler" + this.renderer.samplers.length;
      throwWarning(
        `Sampler: you are trying to create a sampler without the mandatory name parameter. A default name will be used instead: ${name}`
      );
    }
    this.name = name;
    this.options = {
      addressModeU,
      addressModeV,
      magFilter,
      minFilter,
      mipmapFilter,
      maxAnisotropy,
      type,
      ...compare !== null && { compare }
    };
    this.createSampler();
    this.createBinding();
  }
  /**
   * Set the {@link GPUSampler}.
   */
  createSampler() {
    this.sampler = this.renderer.createSampler(this);
  }
  /**
   * Set the {@link SamplerBinding | binding}.
   */
  createBinding() {
    this.binding = new SamplerBinding({
      label: this.label,
      name: this.name,
      bindingType: "sampler",
      sampler: this.sampler,
      type: this.options.type
    });
  }
}

export { Sampler };
