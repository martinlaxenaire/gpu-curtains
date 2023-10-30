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
  type: string
  uuid: string
  renderer: Renderer
  options: TextureBindGroupParams
  index: number

  bindings: BindGroupBindingElement[]
  bindingsBuffers: BindGroupBindingBuffer[]

  entries: BindGroupEntries

  bindGroupLayout: null | GPUBindGroupLayout
  bindGroup: null | GPUBindGroup

  needsReset: boolean
  needsPipelineFlush: boolean

  /**
   * BindGroup constructor
   * @param {Renderer | GPUCurtains} renderer - our renderer class object
   * @param {BindGroupParams=} parameters - parameters used to create our bind group
   * @param {string=} parameters.label - bind group label
   * @param {number=} parameters.index - bind group index (used to generate shader code)
   * @param {BindGroupBindingElement[]=} parameters.bindings - array of already created bindings (buffers, texture, etc.)
   * @param {BindGroupInputs} parameters.inputs - inputs that will be used to create additional bindings
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
   * Sets our bind group index
   * @param {number} index
   */
  setIndex(index: number) {
    this.index = index
  }

  /**
   * Adds an array of already created bindings (buffers, texture, etc.) to the bindings array
   * @param {BindGroupBindingElement[]} bindings - bindings to add
   */
  addBindings(bindings: BindGroupBindingElement[] = []) {
    this.bindings = [...this.bindings, ...bindings]
  }

  /**
   * Adds an already created binding (buffers, texture, etc.) to the bindings array
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
   * Create and adds bindings based on inputs provided upon creation
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
   * It can be created if it has bindings and has not been created yet
   * @readonly
   * @type {boolean}
   */
  get shouldCreateBindGroup(): boolean {
    return !this.bindGroup && !!this.bindings.length
  }

  /**
   * Reset our bind group entries
   */
  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: [],
    }
  }

  /**
   * Create buffers, bindings, entries, bind group and bind group layout
   */
  createBindGroup() {
    this.createBindingsBuffers()
    this.setBindGroupLayout()
    this.setBindGroup()
  }

  /**
   * Reset bind group entries and recreates it
   */
  // TODO not necessarily needed?
  resetBindGroup() {
    this.resetEntries()
    this.createBindGroup()
  }

  /**
   * Creates a GPUBuffer from a bind group binding and add bindGroup and bindGroupLayout entries
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
   * Loop through all bindings, and create bindings buffers if they need one
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
   * Create a GPUBindGroupLayout
   */
  setBindGroupLayout() {
    this.bindGroupLayout = this.renderer.createBindGroupLayout({
      label: this.options.label + ' layout',
      entries: this.entries.bindGroupLayout,
    })
  }

  /**
   * Create a GPUBindGroup
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
   * Clones a BindGroup from a list of buffers
   * Useful to create a new bind group with already created buffers, but swapped
   * @param {BindGroupBindingBuffer[]} bindingsBuffers - our input binding buffers
   * @param {boolean} keepLayout - whether we should keep original bind group layout or not
   * @returns {AllowedBindGroups} - the cloned BindGroup
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
   * Clones a bind group with all its bindings and original buffers
   * @returns {AllowedBindGroups} - the cloned BindGroup
   */
  clone(): AllowedBindGroups {
    return this.cloneFromBindingsBuffers()
  }

  /**
   * Destroy our bind group
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
