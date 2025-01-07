import { Binding, BindingParams, SamplerBindingType } from './Binding'

/** Defines a {@link SamplerBinding} {@link SamplerBinding#resource | resource} */
export type SamplerBindingResource = GPUSampler | null

/**
 * An object defining all possible {@link SamplerBinding} class instancing parameters
 */
export interface SamplerBindingParams extends BindingParams {
  /** The binding type of the {@link SamplerBinding} */
  bindingType?: SamplerBindingType
  /** {@link SamplerBinding} {@link GPUBindGroup | GPU bind group} resource */
  sampler: SamplerBindingResource
  /** The bind group layout binding {@link GPUSamplerBindingLayout#type | type} of this {@link GPUSampler | GPU sampler} */
  type: GPUSamplerBindingType
}

/**
 * Used to handle GPUSampler bindings.
 *
 * Provide both {@link SamplerBinding#resourceLayout | resourceLayout} and {@link SamplerBinding#resource | resource} to the {@link GPUBindGroupLayout} and {@link GPUBindGroup}.<br>
 * Also create the appropriate WGSL code snippet to add to the shaders.
 */
export class SamplerBinding extends Binding {
  /** The binding type of the {@link SamplerBinding} */
  bindingType: SamplerBindingType
  /** Our {@link SamplerBinding} resource, i.e. a {@link GPUSampler} */
  sampler: SamplerBindingResource
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link SamplerBinding} */
  wgslGroupFragment: string[]
  /** Options used to create this {@link SamplerBinding} */
  options: SamplerBindingParams

  /**
   * SamplerBinding constructor
   * @param parameters - {@link SamplerBindingParams | parameters} used to create our SamplerBindings
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

    this.cacheKey += `${type},`

    this.options = {
      ...this.options,
      sampler,
      type,
    }

    this.resource = sampler // should be a sampler

    this.setWGSLFragment()
  }

  /**
   * Get {@link GPUDevice.createBindGroupLayout().sampler | GPUBindGroupLayout entry resource}.
   * @readonly
   */
  get resourceLayout(): {
    /** {@link GPUBindGroupLayout | bind group layout} resource */
    sampler: GPUSamplerBindingLayout
  } {
    return {
      sampler: {
        type: this.options.type, // TODO set shouldResetBindGroupLayout to true if it changes afterwards
      },
    }
  }

  /**
   * Get the resource cache key
   * @readonly
   */
  get resourceLayoutCacheKey(): string {
    return `sampler,${this.options.type},${this.visibility},`
  }

  /**
   * Get the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
   */
  get resource(): SamplerBindingResource {
    return this.sampler
  }

  /**
   * Set the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
   * @param value - new bind group resource
   */
  set resource(value: SamplerBindingResource) {
    // resource changed, update bind group!
    if (value && this.sampler) this.shouldResetBindGroup = true
    this.sampler = value
  }

  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [
      `var ${this.name}: ${this.options.type === 'comparison' ? `${this.bindingType}_comparison` : this.bindingType};`,
    ]
  }
}
