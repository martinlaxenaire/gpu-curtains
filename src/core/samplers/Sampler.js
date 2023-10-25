import { isRenderer } from '../../utils/renderer-utils'
import { SamplerBindings } from '../bindings/SamplerBindings'
import { throwWarning } from '../../utils/utils'

export class Sampler {
  constructor(
    renderer,
    {
      label = 'Sampler',
      name,
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

    if (!name && !this.renderer.production) {
      name = 'sampler' + this.renderer.samplers.length
      throwWarning(
        `Sampler: you are trying to create a sampler without the mandatory name parameter. A default name will be used instead: ${name}`
      )
    }

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
