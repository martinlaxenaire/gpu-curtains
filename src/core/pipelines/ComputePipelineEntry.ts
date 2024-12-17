import { PipelineEntry } from './PipelineEntry'
import { isRenderer } from '../renderers/utils'
import { throwError } from '../../utils/utils'
import { PipelineEntryParams, PipelineEntryShaders } from '../../types/PipelineEntries'
import { BindGroupBufferBindingElement } from '../../types/BindGroups'

/**
 * Used to create a {@link PipelineEntry} specifically designed to handle {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}.
 *
 * ## Shaders patching
 *
 * The {@link ComputePipelineEntry} uses each of its {@link ComputePipelineEntry#bindGroups | bind groups} {@link core/bindings/Binding.Binding | Binding} to patch the given compute shader before creating the {@link GPUShaderModule}.<br>
 * It will prepend every {@link core/bindings/Binding.Binding | Binding} WGSL code snippets (or fragments) with the correct bind group and bindings indices.
 *
 * ## Pipeline compilation
 *
 * The {@link ComputePipelineEntry} will then create a {@link GPUComputePipeline} (asynchronously by default).
 */
export class ComputePipelineEntry extends PipelineEntry {
  /** Shaders to use with this {@link ComputePipelineEntry} */
  shaders: PipelineEntryShaders
  /** {@link GPUComputePipelineDescriptor | Compute pipeline descriptor} based on {@link layout} and {@link shaders} */
  descriptor: GPUComputePipelineDescriptor | null

  /**
   * ComputePipelineEntry constructor
   * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link ComputePipelineEntry}
   */
  constructor(parameters: PipelineEntryParams) {
    const { label, renderer, bindGroups } = parameters

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

  /* SHADERS */

  /**
   * Patch the shaders by appending all the {@link bindGroups | bind groups}) WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
   */
  patchShaders() {
    this.shaders.compute.head = ''
    this.shaders.compute.code = ''

    const groupsBindings = []
    for (const bindGroup of this.bindGroups) {
      let bindIndex = 0
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
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
    }

    for (const groupBinding of groupsBindings) {
      // do not duplicate structs
      if (
        groupBinding.wgslStructFragment &&
        this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1
      ) {
        this.shaders.compute.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.compute.head}`
      }

      // do not duplicate struct var as well
      if (this.shaders.compute.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
        this.shaders.compute.head = `${this.shaders.compute.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`
      }

      if (groupBinding.newLine) this.shaders.compute.head += `\n`
    }

    this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code
  }

  /* SETUP */

  /**
   * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders()

    this.shaders.compute.module = this.createShaderModule({
      code: this.shaders.compute.code,
      type: 'compute',
    })
  }

  /**
   * Create the compute pipeline {@link descriptor}
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
   * Create the compute {@link pipeline}
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
   * Asynchronously create the compute {@link pipeline}
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
   * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our compute {@link pipeline}
   * @async
   */
  async compilePipelineEntry(): Promise<void> {
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
