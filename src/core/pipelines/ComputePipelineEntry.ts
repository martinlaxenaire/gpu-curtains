import { PipelineEntry } from './PipelineEntry'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { throwError } from '../../utils/utils'
import { PipelineEntryBuffersParams } from '../../types/core/pipelines/ComputePipelineEntry'
import { PipelineEntryShaders, PipelineEntryParams } from '../../types/core/pipelines/PipelineEntry'
import { BindGroupBufferBindingElement } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'

export class ComputePipelineEntry extends PipelineEntry {
  shaders: PipelineEntryShaders
  descriptor: GPUComputePipelineDescriptor | null

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

  setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams) {
    const { bindGroups } = parameters

    this.setPipelineEntryBindGroups(bindGroups)

    this.setPipelineEntry()
  }

  /** SHADERS **/

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
      if (
        groupBinding.wgslStructFragment &&
        this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1
      ) {
        this.shaders.compute.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.compute.head}`
      }

      this.shaders.compute.head = `${this.shaders.compute.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

      if (groupBinding.newLine) this.shaders.compute.head += `\n`
    })

    this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code
  }

  /** SETUP **/

  createShaders() {
    this.patchShaders()

    this.shaders.compute.module = this.createShaderModule({
      code: this.shaders.compute.code,
      type: 'compute',
    })
  }

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

  createComputePipeline() {
    if (!this.shaders.compute.module) return

    try {
      this.pipeline = this.renderer.createComputePipeline(this.descriptor)
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

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

  setPipelineEntry() {
    super.setPipelineEntry()

    if (this.options.useAsync) {
      this.createComputePipelineAsync()
    } else {
      this.createComputePipeline()
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    }
  }
}