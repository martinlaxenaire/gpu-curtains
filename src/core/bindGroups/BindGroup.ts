import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID, toKebabCase } from '../../utils/utils'
import { WritableBufferBinding, WritableBufferBindingParams } from '../bindings/WritableBufferBinding'
import { BufferBinding } from '../bindings/BufferBinding'
import {
  AllowedBindGroups,
  BindGroupBindingElement,
  BindGroupBufferBindingElement,
  BindGroupEntries,
  BindGroupParams,
  ReadOnlyInputBindings,
} from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { TextureBindGroupParams } from './TextureBindGroup'
import { BindingType } from '../bindings/Binding'

/**
 * Used to handle all inputs data sent to the GPU.<br>
 * In WebGPU, data (buffers, textures or samplers, called bindings) are organised by bind groups, containing those bindings.
 *
 * ## Bindings
 *
 * A {@link BindGroup} is responsible for creating each {@link BufferBinding} {@link GPUBuffer} and then the {@link GPUBindGroup} and {@link GPUBindGroupLayout} that are used to create {@link GPUComputePipeline} or {@link GPURenderPipeline}.<br>
 * Those are generally automatically created by the {@link core/materials/Material.Material | Material} using this {@link BindGroup}. If you need to manually create them, you will have to call its {@link BindGroup#createBindGroup | `createBindGroup()` method}
 *
 * ### Samplers and textures
 *
 * A {@link BindGroup} is best suited to handle {@link GPUBuffer} only bindings. If you need to handle {@link GPUSampler}, a {@link GPUTexture} or a {@link GPUExternalTexture}, you should use a {@link core/bindGroups/TextureBindGroup.TextureBindGroup | TextureBindGroup} instead.
 *
 * ### Updating a GPUBindGroup or GPUBindGroupLayout
 *
 * Each time one of the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#resource | binding resource} changes, its {@link BindGroup#bindGroup | bindGroup} will be recreated (usually, when a {@link GPUTexture} is uploaded).<br>
 * Each time one of the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#resource_layout_objects | binding resource layout} changes, its {@link BindGroup#bindGroupLayout | bindGroupLayout} and {@link BindGroup#bindGroup | bindGroup} will be recreated, and the {@link GPUComputePipeline} or {@link GPURenderPipeline} will be recreated as well.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * const bindGroup = new BindGroup(gpuCurtains, {
 *   label: 'My bind group',
 *   uniforms: {
 *     params: {
 *       struct: {
 *         opacity: {
 *           type: 'f32',
 *           value: 1,
 *         },
 *         mousePosition: {
 *           type: 'vec2f',
 *           value: new Vec2(),
 *         },
 *       },
 *     },
 *   },
 * })
 *
 * // create the GPU buffer, bindGroupLayout and bindGroup
 * bindGroup.createBindGroup()
 * ```
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

  /** List of {@link BindGroupBindingElement | bindings} (buffers, texture, etc.) handled by this {@link BindGroup} */
  bindings: BindGroupBindingElement[]

  /** Our {@link BindGroup} {@link BindGroupEntries | entries} objects */
  entries: BindGroupEntries

  /** Our {@link BindGroup}{@link GPUBindGroupLayout} */
  bindGroupLayout: null | GPUBindGroupLayout
  /** Our {@link BindGroup} {@link GPUBindGroup} */
  bindGroup: null | GPUBindGroup

  /** Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup} s*/
  needsPipelineFlush: boolean

  /** A Set to store this {@link BindGroup} consumers ({@link core/materials/Material.Material#uuid | Material uuid})  */
  consumers: Set<string>

  /**
   * BindGroup constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}
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

    this.bindGroupLayout = null
    this.bindGroup = null

    // if we ever update our bind group layout
    // we will have to recreate the whole pipeline again
    this.needsPipelineFlush = false

    this.consumers = new Set()

    // add the bind group to the buffers consumers
    for (const binding of this.bufferBindings) {
      if ('buffer' in binding) {
        binding.buffer.consumers.add(this.uuid)
      }

      if ('resultBuffer' in binding) {
        binding.resultBuffer.consumers.add(this.uuid)
      }
    }

    this.renderer.addBindGroup(this)
  }

  /**
   * Sets our {@link BindGroup#index | bind group index}
   * @param index - {@link BindGroup#index | bind group index} to set
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
   * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}
   * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding
   * @returns - a {@link bindings} array
   */
  createInputBindings(
    bindingType: BindingType = 'uniform',
    inputs: ReadOnlyInputBindings = {}
  ): BindGroupBindingElement[] {
    const bindings = [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey] as WritableBufferBindingParams

        const bindingParams: WritableBufferBindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          visibility: binding.access === 'read_write' ? 'compute' : binding.visibility,
          useStruct: true, // by default
          access: binding.access ?? 'read', // read by default
          struct: binding.struct,
          ...(binding.shouldCopyResult !== undefined && { shouldCopyResult: binding.shouldCopyResult }),
        }

        if (binding.useStruct !== false) {
          let key = `${bindingType},${
            binding.visibility === undefined ? 'all' : binding.access === 'read_write' ? 'compute' : binding.visibility
          },true,${binding.access ?? 'read'},`

          Object.keys(binding.struct).forEach((bindingKey) => {
            key += `${bindingKey},${binding.struct[bindingKey].type},`
          })

          if (binding.shouldCopyResult !== undefined) {
            key += `${binding.shouldCopyResult},`
          }

          const cachedBinding = this.renderer.deviceManager.bufferBindings.get(key)

          if (cachedBinding) {
            return cachedBinding.clone(bindingParams)
          }
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

    bindings.forEach((binding) => {
      this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding)
    })

    return bindings
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
   * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
   */
  createBindGroup() {
    this.fillEntries()
    this.setBindGroupLayout()
    this.setBindGroup()
  }

  /**
   * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}
   */
  resetBindGroup() {
    this.entries.bindGroup = []
    for (const binding of this.bindings) {
      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource,
      })
    }

    this.setBindGroup()
  }

  /**
   * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
   */
  resetBindGroupLayout() {
    this.entries.bindGroupLayout = []
    for (const binding of this.bindings) {
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility,
      })
    }

    this.setBindGroupLayout()
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
   */
  loseContext() {
    this.resetEntries()

    for (const binding of this.bufferBindings) {
      binding.buffer.reset()

      if ('resultBuffer' in binding) {
        binding.resultBuffer.reset()
      }
    }

    this.bindGroup = null
    this.bindGroupLayout = null
    this.needsPipelineFlush = true
  }

  /**
   * Get all {@link BindGroup#bindings | bind group bindings} that handle a {@link GPUBuffer}
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
    binding.buffer.createBuffer(this.renderer, {
      label: this.options.label + ': ' + binding.bindingType + ' buffer from: ' + binding.label,
      usage:
        binding.bindingType === 'uniform'
          ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
          : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX,
    })

    if ('resultBuffer' in binding) {
      binding.resultBuffer.createBuffer(this.renderer, {
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
    for (const binding of this.bindings) {
      // if no visibility specified, just set it to the maximum default capabilities
      if (!binding.visibility) {
        binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
      }

      // if it's a buffer binding, create the GPUBuffer
      if ('buffer' in binding) {
        if (!binding.buffer.GPUBuffer) {
          this.createBindingBuffer(binding)
        }
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
    }
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
    // this.bindGroupLayoutCacheKey = JSON.stringify(this.entries.bindGroupLayout)
    //
    // const bindGroupLayout = this.renderer.deviceManager.bindGroupLayouts.get(this.bindGroupLayoutCacheKey)
    //
    // if (bindGroupLayout) {
    //   this.bindGroupLayout = bindGroupLayout
    // } else {
    //   this.bindGroupLayout = this.renderer.createBindGroupLayout({
    //     label: this.options.label + ' layout',
    //     entries: this.entries.bindGroupLayout,
    //   })
    //
    //   this.renderer.deviceManager.bindGroupLayouts.set(this.bindGroupLayoutCacheKey, this.bindGroupLayout)
    // }
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
    this.bindings.forEach((binding, index) => {
      if ('buffer' in binding) {
        // update binding elements
        binding.update()

        // now write to the GPUBuffer if needed
        if (binding.shouldUpdate) {
          // bufferOffset is always equals to 0 in our case
          if (!binding.useStruct && binding.bufferElements.length > 1) {
            // we're in a non struct buffer binding with multiple entries
            // that should not happen but that way we're covered
            this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.bufferElements[index].view)
          } else {
            this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.arrayBuffer)
          }
        }

        // reset update flag
        binding.shouldUpdate = false
      }
    })
  }

  /**
   * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
   * Called at each render from the parentMesh {@link core/materials/Material.Material | material}
   */
  update() {
    this.updateBufferBindings()

    const needBindGroupReset = this.bindings.some((binding) => binding.shouldResetBindGroup)
    const needBindGroupLayoutReset = this.bindings.some((binding) => binding.shouldResetBindGroupLayout)

    // since other bind groups might be using that binding
    // wait for the end of the render loop to reset the bindings flags
    if (needBindGroupReset || needBindGroupLayoutReset) {
      this.renderer.onAfterCommandEncoderSubmission.add(
        () => {
          for (const binding of this.bindings) {
            binding.shouldResetBindGroup = false
            binding.shouldResetBindGroupLayout = false
          }
        },
        { once: true }
      )
    }

    if (needBindGroupLayoutReset) {
      this.resetBindGroupLayout()
      // bind group layout has changed, we have to recreate the pipeline
      this.needsPipelineFlush = true
    }

    if (needBindGroupReset) {
      this.resetBindGroup()
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

    for (const binding of bindingsRef) {
      bindGroupCopy.addBinding(binding)

      // if it's a buffer binding without a GPUBuffer, create it now
      if ('buffer' in binding) {
        if (!binding.buffer.GPUBuffer) {
          this.createBindingBuffer(binding)
        }

        binding.buffer.consumers.add(bindGroupCopy.uuid)

        if ('resultBuffer' in binding) {
          binding.resultBuffer.consumers.add(bindGroupCopy.uuid)
        }
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
    }

    // if we should copy the given bind group layout
    if (keepLayout) {
      bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout]
    }

    bindGroupCopy.setBindGroupLayout()
    bindGroupCopy.setBindGroup()

    return bindGroupCopy
  }

  /**
   * Destroy our {@link BindGroup}
   * Most important is to destroy the GPUBuffers to free the memory
   */
  destroy() {
    this.renderer.removeBindGroup(this)

    for (const binding of this.bufferBindings) {
      if ('buffer' in binding) {
        this.renderer.removeBuffer(binding.buffer)

        binding.buffer.consumers.delete(this.uuid)
        if (!binding.buffer.consumers.size) {
          binding.buffer.destroy()
        }
      }

      if ('resultBuffer' in binding) {
        this.renderer.removeBuffer(binding.resultBuffer)

        binding.resultBuffer.consumers.delete(this.uuid)
        if (!binding.resultBuffer.consumers.size) {
          binding.resultBuffer.destroy()
        }
      }
    }

    this.bindings = []
    this.bindGroupLayout = null
    this.bindGroup = null
    this.resetEntries()
  }
}
