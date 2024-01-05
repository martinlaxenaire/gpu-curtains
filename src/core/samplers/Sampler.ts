import { isRenderer, Renderer } from '../renderers/utils'
import { SamplerBinding } from '../bindings/SamplerBinding'
import { generateUUID, throwWarning } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/** Options used to create a {@link Sampler} */
export interface SamplerOptions extends Partial<GPUSamplerDescriptor>, GPUSamplerBindingLayout {}

/**
 * Parameters used to create a {@link Sampler}
 */
export interface SamplerParams extends SamplerOptions {
  /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBinding} */
  name: string
}

/**
 * Sampler class:
 * Used to create a {@link GPUSampler} and its associated {@link SamplerBinding}
 */
export class Sampler {
  /** The type of the {@link Sampler} */
  type: string
  /** The universal unique id of this {@link Sampler} */
  readonly uuid: string
  /** [renderer]{@link Renderer} used by this {@link Sampler} */
  renderer: Renderer
  /** The label of the {@link Sampler}, used to create the {@link GPUSampler} for debugging purpose */
  label: string
  /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBinding} */
  name: string
  /** Options used to create this {@link Sampler} */
  options: SamplerOptions

  /** {@link GPUSampler} */
  sampler: GPUSampler
  /** {@link SamplerBinding} to pass to a [bind group]{@link BindGroup} */
  binding: SamplerBinding

  /**
   * Sampler constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
   * @param parameters - [parameters]{@link SamplerParams} used to create this {@link Sampler}
   */
  constructor(
    renderer: GPUCurtains | Renderer,
    {
      label = 'Sampler',
      name,
      addressModeU = 'repeat',
      addressModeV = 'repeat',
      magFilter = 'linear',
      minFilter = 'linear',
      mipmapFilter = 'linear',
      maxAnisotropy = 1,
      type = 'filtering',
    } = {} as SamplerParams
  ) {
    this.type = 'Sampler'
    this.uuid = generateUUID()

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

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
      type,
    } as SamplerOptions

    this.createSampler()
    this.createBinding()
  }

  /**
   * Set the {@link GPUSampler}
   */
  createSampler() {
    this.sampler = this.renderer.createSampler(this)
  }

  /**
   * Set the [binding]{@link SamplerBinding}
   */
  createBinding() {
    this.binding = new SamplerBinding({
      label: this.label,
      name: this.name,
      bindingType: 'sampler',
      sampler: this.sampler,
      type: this.options.type,
    })
  }
}
