import { PipelineEntry } from './PipelineEntry'
import { isRenderer, Renderer } from '../renderers/utils'
import { throwError } from '../../utils/utils'
import { PipelineEntryParams, PipelineEntryPropertiesParams, PipelineEntryShaders } from '../../types/PipelineEntries'
import { BindGroupBufferBindingElement } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * ComputePipelineEntry class:
 * Used to create a pipeline entry specifically designed to handle compute passes.
 * @extends PipelineEntry
 */
export class ComputePipelineEntry extends PipelineEntry {
  /** Shaders to use with this {@link ComputePipelineEntry} */
  shaders: PipelineEntryShaders
  /** [Compute pipeline descriptor]{@link GPUComputePipelineDescriptor} based on [layout]{@link ComputePipelineEntry#layout} and [shaders]{@link ComputePipelineEntry#shaders} */
  descriptor: GPUComputePipelineDescriptor | null

  /**
   * ComputePipelineEntry constructor
   * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link ComputePipelineEntry}
   */
  constructor(parameters: PipelineEntryParams) {
    let { renderer } = parameters
    const { label } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'ComputePipelineEntry'

    isRenderer(renderer, label ? label + ' ' + type : type)

    super(parameters)

    this.type = type

    this.shaders = {
      compute: {
        head: '',
        code: '',
        module: null,
      },
    }

    this.descriptor = null
  }

  /**
   * Set {@link ComputePipelineEntry} properties (in this case the [bind groups]{@link ComputePipelineEntry#bindGroups})
   * @param parameters - the [bind groups]{@link ComputeMaterial#bindGroups} to use
   */
  setPipelineEntryProperties(parameters: PipelineEntryPropertiesParams) {
    const { bindGroups } = parameters

    this.setPipelineEntryBindGroups(bindGroups)
  }

  /* SHADERS */

  /**
   * Patch the shaders by appending all the [bind groups]{@link ComputePipelineEntry#bindGroups}) WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
   */
  patchShaders() {
    this.shaders.compute.head = ''
    this.shaders.compute.code = ''

    const groupsBindings = []
    this.bindGroups.forEach((bindGroup) => {
      let bindIndex = 0
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
            visibility: binding.visibility,
            bindIndex,
            wgslStructFragment: (binding as BindGroupBufferBindingElement).wgslStructFragment,
            wgslGroupFragment: groupFragment,
            newLine:
              bindingIndex === bindGroup.bindings.length - 1 &&
              groupFragmentIndex === binding.wgslGroupFragment.length - 1,
          })

          bindIndex++
        })
      })
    })

    groupsBindings.forEach((groupBinding) => {
      // do not duplicate structs
      if (
        groupBinding.wgslStructFragment &&
        this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1
      ) {
        this.shaders.compute.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.compute.head}`
      }

      // do not duplicate bindings var as well
      if (this.shaders.compute.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
        this.shaders.compute.head = `${this.shaders.compute.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`
      }

      if (groupBinding.newLine) this.shaders.compute.head += `\n`
    })

    this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code
  }

  /* SETUP */

  /**
   * Create the [shaders]{@link ComputePipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders()

    this.shaders.compute.module = this.createShaderModule({
      code: this.shaders.compute.code,
      type: 'compute',
    })
  }

  /**
   * Create the [compute pipeline descriptor]{@link ComputePipelineEntry#descriptor}
   */
  createPipelineDescriptor() {
    if (!this.shaders.compute.module) return

    this.descriptor = {
      label: this.options.label,
      layout: this.layout,
      compute: {
        module: this.shaders.compute.module,
        entryPoint: this.options.shaders.compute.entryPoint,
      },
    }
  }

  /**
   * Create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
   */
  createComputePipeline() {
    if (!this.shaders.compute.module) return

    try {
      this.pipeline = this.renderer.createComputePipeline(this.descriptor)
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  /**
   * Asynchronously create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
   * @async
   * @returns - void promise result
   */
  async createComputePipelineAsync(): Promise<void> {
    if (!this.shaders.compute.module) return

    try {
      this.pipeline = await this.renderer.createComputePipelineAsync(this.descriptor)
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  /**
   * Call [super compilePipelineEntry]{@link PipelineEntry#compilePipelineEntry} method, then create our [compute pipeline]{@link ComputePipelineEntry#pipeline}
   * @async
   */
  async compilePipelineEntry() {
    super.compilePipelineEntry()

    if (this.options.useAsync) {
      await this.createComputePipelineAsync()
    } else {
      this.createComputePipeline()
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    }
  }
}
