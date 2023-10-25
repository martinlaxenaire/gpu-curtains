import { Renderer } from '../../types/renderer-utils'
import { SamplerBindings } from '../bindings/SamplerBindings'

interface SamplerParams extends GPUSamplerDescriptor {
  name: string
}

export class Sampler {
  renderer: Renderer
  label: string
  name: string
  options: GPUSamplerDescriptor // TODO not exact

  sampler: GPUSampler
  binding: SamplerBindings

  constructor(
    renderer: Renderer,
    { label, name, addressModeU, addressModeV, magFilter, minFilter, mipmapFilter, maxAnisotropy }?: SamplerParams
  )

  createSampler()
  createBinding()
}