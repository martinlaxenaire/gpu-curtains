import { PipelineEntry } from './PipelineEntry'
import { isRenderer } from '../../utils/renderer-utils'
import { ProjectedShaderChunks, ShaderChunks } from '../shaders/ShaderChunks'

export class ComputePipelineEntry extends PipelineEntry {
  constructor(parameters) {
    let { renderer } = parameters
    const { label, shaders } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

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
  }

  setPipelineEntryBuffers(parameters) {
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
            wgslStructFragment: binding.wgslStructFragment,
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
      type: 'Compute',
    })
  }

  createComputePipeline() {
    if (!this.shaders.compute.module) return

    this.pipeline = this.renderer.createComputePipeline({
      label: this.options.label,
      layout: this.layout,
      compute: {
        module: this.shaders.compute.module,
        entryPoint: this.options.shaders.compute.entryPoint,
      },
    })
  }

  setPipelineEntry() {
    super.setPipelineEntry()
    this.createComputePipeline()
    this.ready = true
  }
}
