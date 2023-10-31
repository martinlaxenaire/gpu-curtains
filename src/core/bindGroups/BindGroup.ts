import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { generateUUID, toKebabCase } from '../../utils/utils'
import { getBindGroupLayoutBindingType, TypedArray } from '../../utils/buffers-utils'
import { WorkBufferBindings, WorkBufferBindingsParams } from '../bindings/WorkBufferBindings'
import { BufferBindings } from '../bindings/BufferBindings'
import {
  AllowedBindGroups,
  AllowedInputBindingsParams,
  BindGroupBindingBuffer,
  BindGroupBindingElement,
  BindGroupBufferBindingElement,
  BindGroupEntries,
  BindGroupParams,
  WorkInputBindingsParams,
  InputBindings,
} from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { TextureBindGroupParams } from './TextureBindGroup'
import { BindingType } from '../bindings/Bindings'

/**
 * BindGroup class:
 * Used to handle all inputs data sent to the GPU. Data (buffers, textures or samplers) are organised by Bindings.
 * It creates GPUBuffer, GPUBindGroup and GPUBindGroupLayout that are used by the GPU Pipelines.
 */
export class BindGroup {
  /**
   * The type of the {@link BindGroup}
   * @type {string}
   */
  type: string
  /**
   * The universal unique id of the {@link BindGroup}
   * @type {string}
   */
  uuid: string
  /**
   * The {@link Renderer} used
   * @type {Renderer}
   */
  renderer: Renderer
  /**
   * Options used to create this {@link BindGroup}
   * @type {TextureBindGroupParams}
   */
  options: TextureBindGroupParams
  /**
   * Index of this {@link BindGroup}, used to link bindings in the shaders
   * @type {number}
   */
  index: number

  /**
   * List of [bindings]{@link BindGroupBindingElement} (buffers, texture, etc.) handled by this {@link BindGroup}
   * @type {BindGroupBindingElement[]}
   */
  bindings: BindGroupBindingElement[]
  /**
   * List of [bindingsBuffers]{@link BindGroupBindingBuffer} handled by this {@link BindGroup}.
   * @type {BindGroupBindingBuffer[]}
   */
  bindingsBuffers: BindGroupBindingBuffer[]

  /**
   * Our {@link BindGroup} [entries]{@link BindGroupEntries} objects
   * @type {BindGroupEntries}
   */
  entries: BindGroupEntries

  /**
   * Our {@link BindGroup} GPUBindGroupLayout
   * @type {?GPUBindGroupLayout}
   */
  bindGroupLayout: null | GPUBindGroupLayout
  /**
   * Our {@link BindGroup} GPUBindGroup
   * @type {?GPUBindGroup}
   */
  bindGroup: null | GPUBindGroup

  /**
   * Flag indicating whether we need to totally reset this {@link BindGroup}
   * @type {boolean}
   */
  needsReset: boolean
  /**
   * Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup}
   * @type {boolean}
   */
  needsPipelineFlush: boolean

  /**
   * BindGroup constructor
   * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param {BindGroupParams=} parameters - [parameters]{@link BindGroupParams} used to create our {@link BindGroup}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label = 'BindGroup', index = 0, bindings = [], inputs }: BindGroupParams = {}
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
      ...(inputs && { inputs }),
    }

    this.index = index
    this.uuid = generateUUID()

    this.bindings = []
    bindings.length && this.addBindings(bindings)
    if (this.options.inputs) this.setInputBindings()

    this.resetEntries()
    this.bindingsBuffers = []

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
   * Sets our {@link BindGroup} {@link index}
   * @param {number} index
   */
  setIndex(index: number) {
    this.index = index
  }

  /**
   * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param {BindGroupBindingElement[]} bindings - bindings to add
   */
  addBindings(bindings: BindGroupBindingElement[] = []) {
    this.bindings = [...this.bindings, ...bindings]
  }

  /**
   * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param {BindGroupBindingElement} binding - binding to add
   */
  addBinding(binding: BindGroupBindingElement) {
    this.bindings.push(binding)
  }

  /**
   * Creates Bindings based on a list of inputs
   * @param {BindingType} bindingType - binding type
   * @param {InputBindings} inputs - inputs that will be used to create the binding
   * @returns {BindGroupBindingElement[]} - bindings array
   */
  createInputBindings(bindingType: BindingType = 'uniform', inputs: InputBindings = {}): BindGroupBindingElement[] {
    return [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey] as AllowedInputBindingsParams

        const bindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          useStruct: true, // by default
          bindings: binding.bindings,
          dispatchSize: (binding as WorkInputBindingsParams).dispatchSize,
          visibility: bindingType === 'storageWrite' ? 'compute' : binding.visibility,
        }

        const BufferBindingConstructor = bindingType === 'storageWrite' ? WorkBufferBindings : BufferBindings

        return binding.useStruct !== false
          ? new BufferBindingConstructor(bindingParams as WorkBufferBindingsParams)
          : Object.keys(binding.bindings).map((bindingKey) => {
              bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey)
              bindingParams.name = inputKey + bindingKey
              bindingParams.useStruct = false
              bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

              return new BufferBindingConstructor(bindingParams as WorkBufferBindingsParams)
            })
      }),
    ].flat()
  }

  /**
   * Create and adds {@link bindings} based on inputs provided upon creation
   */
  setInputBindings() {
    this.addBindings([
      ...this.createInputBindings('uniform', this.options.inputs.uniforms),
      ...this.createInputBindings('storage', this.options.inputs.storages),
      ...this.createInputBindings('storageWrite', this.options.inputs.works),
    ])
  }

  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link bindings} and has not been created yet
   * @readonly
   * @type {boolean}
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
    this.createBindingsBuffers()
    this.setBindGroupLayout()
    this.setBindGroup()
  }

  /**
   * Reset {@link BindGroup} {@link entries} and recreates it
   */
  // TODO not necessarily needed?
  resetBindGroup() {
    this.resetEntries()
    this.createBindGroup()
  }

  /**
   * Creates a GPUBuffer from a bind group binding and add bindGroup and bindGroupLayout {@link entries}
   * @param {BindGroupBufferBindingElement} binding - the binding element
   * @param {number} bindIndex - the bind index
   * @param {TypedArray} array - the binding value array
   */
  createBindingBufferElement(binding: BindGroupBufferBindingElement, bindIndex: number, array: TypedArray) {
    const buffer = this.renderer.createBuffer({
      label: this.options.label + ': ' + binding.bindingType + ' buffer from:' + binding.label,
      size: array.byteLength,
      usage:
        binding.bindingType === 'uniform'
          ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
          : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX,
    })

    this.bindingsBuffers.push({
      inputBinding: binding,
      buffer,
      array,
      // TODO useful?
      ...(binding.bindingType === 'storageWrite' && {
        resultBuffer: this.renderer.createBuffer({
          label: this.options.label + ': Result buffer from: ' + binding.label,
          size: binding.value.byteLength,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
      }),
    } as BindGroupBindingBuffer)

    this.entries.bindGroupLayout.push({
      binding: bindIndex,
      buffer: {
        type: getBindGroupLayoutBindingType(binding.bindingType),
      },
      visibility: binding.visibility,
    })

    this.entries.bindGroup.push({
      binding: bindIndex,
      resource: {
        buffer,
      },
    })
  }

  /**
   * Creates binding buffer with correct params
   * @param {BindGroupBufferBindingElement} binding - the binding element
   */
  createBindingBuffer(binding: BindGroupBufferBindingElement) {
    if (!binding.useStruct) {
      binding.bindingElements.forEach((bindingElement) => {
        const bindIndex = this.entries.bindGroupLayout.length

        this.createBindingBufferElement(binding, bindIndex, bindingElement.array)
      })
    } else {
      binding.bindIndex = this.entries.bindGroupLayout.length

      this.createBindingBufferElement(binding, binding.bindIndex, binding.value)
    }
  }

  /**
   * Loop through all {@link bindings}, and create bindings buffers if they need one
   */
  createBindingsBuffers() {
    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding as BindGroupBufferBindingElement)
      }
    })
  }

  /**
   * Get a bind group binding by name/key
   * @param {string} bindingName - the binding name or key
   * @returns {BindGroupBindingElement | null} - the found binding, or null if not found
   */
  getBindingsByName(bindingName = ''): BindGroupBindingElement | null {
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
   * Check whether we should update (write the buffer) our GPUBuffer or not
   * Called at each render from Material
   */
  updateBindings() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      if (bindingBuffer.inputBinding && bindingBuffer.inputBinding.shouldUpdate) {
        // bufferOffset is always equals to 0 in our case
        if (!bindingBuffer.inputBinding.useStruct && bindingBuffer.inputBinding.bindingElements.length > 1) {
          // we're in a non struct buffer binding with multiple entries
          // that should not happen but that way we're covered
          this.renderer.queueWriteBuffer(bindingBuffer.buffer, 0, bindingBuffer.array)
        } else {
          this.renderer.queueWriteBuffer(bindingBuffer.buffer, 0, bindingBuffer.inputBinding.value)
        }
      }

      // reset update flag
      bindingBuffer.inputBinding.shouldUpdate = false
    })
  }

  /**
   * Clones a {@link BindGroup} from a list of {@link bindingsBuffers}
   * Useful to create a new bind group with already created buffers, but swapped
   * @param {BindGroupBindingBuffer[]} bindingsBuffers - our input {@link bindingsBuffers}
   * @param {boolean} keepLayout - whether we should keep original {@link bindGroupLayout} or not
   * @returns {AllowedBindGroups} - the cloned {@link BindGroup}
   */
  cloneFromBindingsBuffers({
    bindingsBuffers = [],
    keepLayout = false,
  }: {
    bindingsBuffers?: BindGroupBindingBuffer[]
    keepLayout?: boolean
  } = {}): AllowedBindGroups {
    const params = { ...this.options }
    params.label += ' (copy)'

    const bindGroupCopy = new (this.constructor as typeof BindGroup)(this.renderer, {
      label: params.label,
    })

    bindGroupCopy.setIndex(this.index)

    const bindingsBuffersRef = bindingsBuffers.length ? bindingsBuffers : this.bindingsBuffers

    bindingsBuffersRef.forEach((bindingBuffer, index) => {
      bindGroupCopy.addBinding(bindingBuffer.inputBinding)

      bindGroupCopy.bindingsBuffers.push({ ...bindingBuffer })

      // if we should create a new bind group layout, fill it
      if (!keepLayout) {
        bindGroupCopy.entries.bindGroupLayout.push({
          binding: bindGroupCopy.entries.bindGroupLayout.length,
          buffer: {
            type: getBindGroupLayoutBindingType(bindingBuffer.inputBinding.bindingType),
          },
          visibility: bindingBuffer.inputBinding.visibility,
        })
      }

      bindGroupCopy.entries.bindGroup.push({
        binding: bindGroupCopy.entries.bindGroup.length,
        resource: {
          buffer: bindingBuffer.buffer,
        },
      })
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
   * Clones a bind group with all its {@link bindings} and original {@link bindingsBuffers}
   * @returns {AllowedBindGroups} - the cloned BindGroup
   */
  clone(): AllowedBindGroups {
    return this.cloneFromBindingsBuffers()
  }

  /**
   * Destroy our {@link BindGroup}
   * Most important is to destroy the GPUBuffers to free the memory
   */
  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.buffer?.destroy()
      bindingBuffer.resultBuffer?.destroy()
    })

    this.bindingsBuffers = []
    // TODO keep the bindings in case we want to recreate it later?
    //this.bindings = []
    this.bindGroupLayout = null
    this.bindGroup = null
    this.resetEntries()
  }
}
