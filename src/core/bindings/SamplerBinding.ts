import { Binding, BindingParams } from './Binding'

/** Defines a {@link SamplerBinding} [resource]{@link SamplerBinding#resource} */
export type SamplerBindingResource = GPUSampler | null

/**
 * An object defining all possible {@link SamplerBinding} class instancing parameters
 */
export interface SamplerBindingParams extends BindingParams {
  /** {@link SamplerBinding} [bind group]{@link GPUBindGroup} resource */
  sampler: SamplerBindingResource
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
   * @param parameters - parameters used to create our SamplerBindings
   * @param {string=} parameters.label - binding label
   * @param {string=} parameters.name - binding name
   * @param {BindingType="uniform"} parameters.bindingType - binding type
   * @param {number=} parameters.bindIndex - bind index inside the bind group
   * @param {MaterialShadersType=} parameters.visibility - shader visibility
   * @param {SamplerBindingResource=} parameters.resource - a GPUSampler
   */
  constructor({
    label = 'Sampler',
    name = 'sampler',
    bindingType,
    bindIndex = 0,
    visibility,
    sampler,
  }: SamplerBindingParams) {
    bindingType = bindingType ?? 'sampler'

    super({ label, name, bindIndex, bindingType, visibility })

    this.options = {
      ...this.options,
      sampler,
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
        type: 'filtering', // TODO let user chose?
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
    this.sampler = value
  }

  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`]
  }
}
