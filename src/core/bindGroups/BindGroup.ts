import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID, toKebabCase } from '../../utils/utils'
import { WritableBufferBinding, WritableBufferBindingParams } from '../bindings/WritableBufferBinding'
import { BufferBinding, BufferBindingParams } from '../bindings/BufferBinding'
import {
  AllowedBindGroups,
  BindGroupBindingElement,
  BindGroupBufferBindingElement,
  BindGroupEntries,
  BindGroupParams,
  ReadWriteInputBindings,
  ReadOnlyInputBindings,
} from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { TextureBindGroupParams } from './TextureBindGroup'
import { BindingType } from '../bindings/Binding'

/**
 * BindGroup class:
 * Used to handle all inputs data sent to the GPU. Data (buffers, textures or samplers) are organised by Bindings.
 * It creates GPUBuffer, GPUBindGroup and GPUBindGroupLayout that are used by the GPU Pipelines.
 */
export class BindGroup {
  /** The type of the {@link BindGroup} */
  type: string
  /** The universal unique id of the {@link BindGroup} */
  uuid: string
  /** The {@link Renderer} used */
  renderer: Renderer
  /** Options used to create this {@link BindGroup} */
  options: TextureBindGroupParams
  /** Index of this {@link BindGroup}, used to link struct in the shaders */
  index: number

  /** List of [struct]{@link BindGroupBindingElement} (buffers, texture, etc.) handled by this {@link BindGroup} */
  // TODO BindGroupBufferBindingElement[] instead??
  bindings: BindGroupBindingElement[]

  /** Our {@link BindGroup} [entries]{@link BindGroupEntries} objects */
  entries: BindGroupEntries

  /** Our {@link BindGroup} GPUBindGroupLayout */
  bindGroupLayout: null | GPUBindGroupLayout
  /** Our {@link BindGroup} GPUBindGroup */
  bindGroup: null | GPUBindGroup

  /** Flag indicating whether we need to totally reset this {@link BindGroup} */
  needsReset: boolean
  /** Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup} s*/
  needsPipelineFlush: boolean

  /**
   * BindGroup constructor
   * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param {BindGroupParams=} parameters - [parameters]{@link BindGroupParams} used to create our {@link BindGroup}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label = 'BindGroup', index = 0, bindings = [], uniforms, storages }: BindGroupParams = {}
  ) {
    this.type = 'BindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, this.type)

    this.renderer = renderer
    this.options = {
      label,
      index,
      bindings,
      ...(uniforms && { uniforms }),
      ...(storages && { storages }),
    }

    this.index = index
    this.uuid = generateUUID()

    this.bindings = []
    bindings.length && this.addBindings(bindings)
    if (this.options.uniforms || this.options.storages) this.setInputBindings()

    this.resetEntries()
    //this.bindingsBuffers = []

    this.bindGroupLayout = null
    this.bindGroup = null

    // we might want to rebuild the whole bind group sometimes
    // like when we're adding textures after the bind group has already been created
    this.needsReset = false

    // if we ever update our bind group layout
    // we'll need to update the bind group as well
    // and most importantly recreate the whole pipeline again
    this.needsPipelineFlush = false
  }

  /**
   * Sets our [BindGroup index]{@link BindGroup#index}
   * @param index - [BindGroup index]{@link BindGroup#index}
   */
  setIndex(index: number) {
    this.index = index
  }

  /**
   * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param bindings - {@link bindings} to add
   */
  addBindings(bindings: BindGroupBindingElement[] = []) {
    this.bindings = [...this.bindings, ...bindings]
  }

  /**
   * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param binding - binding to add
   */
  addBinding(binding: BindGroupBindingElement) {
    this.bindings.push(binding)
  }

  /**
   * Creates Bindings based on a list of inputs
   * @param bindingType - [binding type]{@link Binding#bindingType}
   * @param inputs - [inputs]{@link ReadOnlyInputBindings} that will be used to create the binding
   * @returns - a {@link bindings} array
   */
  createInputBindings(
    bindingType: BindingType = 'uniform',
    inputs: ReadOnlyInputBindings = {}
  ): BindGroupBindingElement[] {
    return [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey] as WritableBufferBindingParams

        const bindingParams: WritableBufferBindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          useStruct: true, // by default
          visibility: binding.access === 'read_write' ? 'compute' : binding.visibility,
          access: binding.access ?? 'read', // read by default
          struct: binding.struct,
          ...(binding.shouldCopyResult !== undefined && { shouldCopyResult: binding.shouldCopyResult }),
        }

        const BufferBindingConstructor = bindingParams.access === 'read_write' ? WritableBufferBinding : BufferBinding

        return binding.useStruct !== false
          ? new BufferBindingConstructor(bindingParams)
          : Object.keys(binding.struct).map((bindingKey) => {
              bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey)
              bindingParams.name = inputKey + bindingKey
              bindingParams.useStruct = false
              bindingParams.struct = { [bindingKey]: binding.struct[bindingKey] }

              return new BufferBindingConstructor(bindingParams)
            })
      }),
    ].flat()
  }

  /**
   * Create and adds {@link bindings} based on inputs provided upon creation
   */
  setInputBindings() {
    this.addBindings([
      ...this.createInputBindings('uniform', this.options.uniforms),
      ...this.createInputBindings('storage', this.options.storages),
    ])
  }

  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link bindings} and has not been created yet
   * @readonly
   */
  get shouldCreateBindGroup(): boolean {
    return !this.bindGroup && !!this.bindings.length
  }

  /**
   * Reset our {@link BindGroup} {@link entries}
   */
  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: [],
    }
  }

  /**
   * Create buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
   */
  createBindGroup() {
    this.fillEntries()
    this.setBindGroupLayout()
    this.setBindGroup()
  }

  /**
   * Reset the [bind group entries]{@link BindGroup#entries}, recreates it then recreate the [bind group layout]{@link BindGroup#bindGroupLayout} and [bind group]{@link BindGroup#bindGroup}
   */
  // TODO not necessarily needed?
  resetBindGroup() {
    this.resetEntries()
    this.createBindGroup()
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration
   */
  loseContext() {
    this.resetEntries()

    this.bufferBindings.forEach((binding) => {
      binding.buffer = null

      if ('resultBuffer' in binding) {
        binding.resultBuffer = null
      }
    })

    this.bindGroup = null
    this.bindGroupLayout = null
    this.needsPipelineFlush = true
  }

  /**
   * Get all [bind group struct]{@link BindGroup#bindings} that handle a {@link GPUBuffer}
   */
  get bufferBindings(): BindGroupBufferBindingElement[] {
    return this.bindings.filter(
      (binding) => binding instanceof BufferBinding || binding instanceof WritableBufferBinding
    ) as BindGroupBufferBindingElement[]
  }

  /**
   * Creates binding GPUBuffer with correct params
   * @param binding - the binding element
   */
  createBindingBuffer(binding: BindGroupBufferBindingElement) {
    // TODO user defined usage?
    // [Kangz](https://github.com/Kangz) said:
    // "In general though COPY_SRC/DST is free (at least in Dawn / Chrome because we add it all the time for our own purpose)."
    binding.buffer = this.renderer.createBuffer({
      label: this.options.label + ': ' + binding.bindingType + ' buffer from: ' + binding.label,
      size: binding.arrayBuffer.byteLength,
      usage:
        binding.bindingType === 'uniform'
          ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
          : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX,
    })

    if ('resultBuffer' in binding) {
      binding.resultBuffer = this.renderer.createBuffer({
        label: this.options.label + ': Result buffer from: ' + binding.label,
        size: binding.arrayBuffer.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
    }
  }

  /**
   * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
   * For buffer struct, create a GPUBuffer first if needed
   */
  fillEntries() {
    this.bindings.forEach((binding) => {
      // if no visibility specified, just set it to the maximum default capabilities
      if (!binding.visibility) {
        binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
      }

      // if it's a buffer binding, create the GPUBuffer
      if ('buffer' in binding && !binding.buffer) {
        this.createBindingBuffer(binding)
      }

      // now that everything is ready, fill our entries
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility,
      })

      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource,
      })
    })
  }

  /**
   * Get a bind group binding by name/key
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingByName(bindingName = ''): BindGroupBindingElement | null {
    return this.bindings.find((binding) => binding.name === bindingName)
  }

  /**
   * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
   */
  setBindGroupLayout() {
    this.bindGroupLayout = this.renderer.createBindGroupLayout({
      label: this.options.label + ' layout',
      entries: this.entries.bindGroupLayout,
    })
  }

  /**
   * Create a GPUBindGroup and set our {@link bindGroup}
   */
  setBindGroup() {
    this.bindGroup = this.renderer.createBindGroup({
      label: this.options.label,
      layout: this.bindGroupLayout,
      entries: this.entries.bindGroup,
    })
  }

  /**
   * Check whether we should update (write) our {@link GPUBuffer} or not.
   */
  updateBufferBindings() {
    this.bufferBindings.forEach((binding, index) => {
      // update binding elements
      binding.update()

      // now write to the GPUBuffer if needed
      if (binding.shouldUpdate) {
        // bufferOffset is always equals to 0 in our case
        if (!binding.useStruct && binding.bufferElements.length > 1) {
          // we're in a non struct buffer binding with multiple entries
          // that should not happen but that way we're covered
          this.renderer.queueWriteBuffer(binding.buffer, 0, binding.bufferElements[index].view)
        } else {
          this.renderer.queueWriteBuffer(binding.buffer, 0, binding.arrayBuffer)
        }
      }

      // reset update flag
      binding.shouldUpdate = false
    })
  }

  /**
   * Update the {@link BindGroup}, which means update its [buffer struct]{@link BindGroup#bufferBindings} and [reset it]{@link BindGroup#resetBindGroup} if needed.
   * Called at each render from the parent {@link Material}
   * (TODO - add a Material 'setBindGroup' method and call it from here? - would allow to automatically update bind groups that are eventually not part of the Material bindGroups when set)
   */
  update() {
    this.updateBufferBindings()

    if (this.needsReset) {
      this.resetBindGroup()
      this.needsReset = false
    }
  }

  /**
   * Clones a {@link BindGroup} from a list of {@link bindings}
   * Useful to create a new bind group with already created buffers, but swapped
   * @param parameters - parameters to use for cloning
   * @param parameters.bindings - our input {@link bindings}
   * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not
   * @returns - the cloned {@link BindGroup}
   */
  clone({
    bindings = [],
    keepLayout = false,
  }: {
    bindings?: BindGroupBindingElement[]
    keepLayout?: boolean
  } = {}): AllowedBindGroups {
    const params = { ...this.options }
    params.label += ' (copy)'

    const bindGroupCopy = new (this.constructor as typeof BindGroup)(this.renderer, {
      label: params.label,
    })

    bindGroupCopy.setIndex(this.index)
    bindGroupCopy.options = params

    const bindingsRef = bindings.length ? bindings : this.bindings

    bindingsRef.forEach((binding, index) => {
      bindGroupCopy.addBinding(binding)

      // if it's a buffer binding without a GPUBuffer, create it now
      if ('buffer' in binding && !binding.buffer) {
        bindGroupCopy.createBindingBuffer(binding)
      }

      // if we should create a new bind group layout, fill it
      if (!keepLayout) {
        bindGroupCopy.entries.bindGroupLayout.push({
          binding: bindGroupCopy.entries.bindGroupLayout.length,
          ...binding.resourceLayout,
          visibility: binding.visibility,
        })
      }

      bindGroupCopy.entries.bindGroup.push({
        binding: bindGroupCopy.entries.bindGroup.length,
        resource: binding.resource,
      } as GPUBindGroupEntry)
    })

    // if we should copy the given bind group layout
    if (keepLayout) {
      bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout]
    }

    bindGroupCopy.setBindGroupLayout()
    bindGroupCopy.setBindGroup()

    return bindGroupCopy
  }

  /**
   * Clones a bind group with all its {@link bindings}
   * @returns - the cloned BindGroup
   */
  // clone(): AllowedBindGroups {
  //   return this.cloneFromBindings()
  // }

  /**
   * Destroy our {@link BindGroup}
   * Most important is to destroy the GPUBuffers to free the memory
   */
  destroy() {
    this.bufferBindings.forEach((binding) => {
      if ('buffer' in binding) {
        this.renderer.removeBuffer(binding.buffer)
        binding.buffer?.destroy()
      }

      if ('resultBuffer' in binding) {
        this.renderer.removeBuffer(binding.resultBuffer)
        binding.resultBuffer?.destroy()
      }
    })

    this.bindings = []
    // TODO keep the struct in case we want to recreate it later?
    //this.struct = []
    this.bindGroupLayout = null
    this.bindGroup = null
    this.resetEntries()
  }
}
