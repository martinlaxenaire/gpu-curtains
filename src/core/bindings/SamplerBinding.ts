import { Binding, BindingParams } from './Binding'
import { SamplerOptions } from '../samplers/Sampler'

/** Defines a {@link SamplerBinding} [resource]{@link SamplerBinding#resource} */
export type SamplerBindingResource = GPUSampler | null

/**
 * An object defining all possible {@link SamplerBinding} class instancing parameters
 */
export interface SamplerBindingParams extends BindingParams {
  /** {@link SamplerBinding} [bind group]{@link GPUBindGroup} resource */
  sampler: SamplerBindingResource
  /** The bind group layout binding [type]{@link GPUSamplerBindingLayout#type} of this [sampler]{@link GPUSampler} */
  type: SamplerOptions['type']
}

/**
 * SamplerBinding class:
 * Used to handle GPUSampler struct
 * @extends Binding
 */
export class SamplerBinding extends Binding {
  /** Our {@link SamplerBinding} resource, i.e. a {@link GPUSampler} */
  sampler: SamplerBindingResource
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link SamplerBinding} */
  wgslGroupFragment: string[]
  /** Options used to create this {@link SamplerBinding} */
  options: SamplerBindingParams

  /**
   * SamplerBinding constructor
   * @param parameters - [parameters]{@link SamplerBindingParams} used to create our SamplerBindings
   */
  constructor({
    label = 'Sampler',
    name = 'sampler',
    bindingType,
    visibility,
    sampler,
    type = 'filtering',
  }: SamplerBindingParams) {
    bindingType = bindingType ?? 'sampler'

    super({ label, name, bindingType, visibility })

    this.options = {
      ...this.options,
      sampler,
      type,
    }

    this.resource = sampler // should be a sampler

    this.setWGSLFragment()
  }

  /**
   * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#sampler}
   */
  get resourceLayout(): { sampler: GPUSamplerBindingLayout } {
    return {
      sampler: {
        type: this.options.type, // TODO set shouldResetBindGroupLayout to true if it changes afterwards
      },
    }
  }

  /**
   * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
   */
  get resource(): SamplerBindingResource {
    return this.sampler
  }

  set resource(value: SamplerBindingResource) {
    // resource changed, update bind group!
    if (value && this.sampler) this.shouldResetBindGroup = true
    this.sampler = value
  }

  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`]
  }
}
