import { isRenderer } from '../../utils/renderer-utils'
import { SamplerBindings } from '../bindings/SamplerBindings'

export class Sampler {
  constructor(
    renderer,
    {
      label = 'Default sampler',
      name = 'defaultSampler',
      addressModeU = 'repeat',
      addressModeV = 'repeat',
      magFilter = 'linear',
      minFilter = 'linear',
      mipmapFilter = 'linear',
      maxAnisotropy = 1,
    } = {}
  ) {
    this.type = 'Sampler'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, label ? label + ' ' + this.type : this.type)

    this.renderer = renderer

    this.label = label
    this.name = name

    this.options = {
      addressModeU,
      addressModeV,
      magFilter,
      minFilter,
      mipmapFilter,
      maxAnisotropy,
    }

    this.createSampler()
    this.createBinding()
  }

  createSampler() {
    this.sampler = this.renderer.createSampler(this)
  }

  createBinding() {
    this.binding = new SamplerBindings({
      label: this.label,
      name: this.name,
      bindingType: 'sampler',
      resource: this.sampler,
    })
  }
}
