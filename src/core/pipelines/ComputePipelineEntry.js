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

    this.bindGroups.toReversed().forEach((bindGroup) => {
      bindGroup.bindings.toReversed().forEach((binding) => {
        this.shaders.compute.head = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.compute.head}`

        if (binding.wgslStructFragment) {
          this.shaders.compute.head = `\n${binding.wgslStructFragment}\n${this.shaders.compute.head}`
        }
      })
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
