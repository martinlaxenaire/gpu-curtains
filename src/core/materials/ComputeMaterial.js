import { Material } from './Material'
import { isRenderer } from '../../utils/renderer-utils'
import { WorkBindGroup } from '../bindGroups/WorkBindGroup'

export class ComputeMaterial extends Material {
  constructor(renderer, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    const type = 'ComputeMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    let { shaders, works } = parameters
    console.log(parameters, this)

    if (!shaders || !shaders.compute) {
      shaders = {
        compute: {},
      }
    }

    if (!shaders.compute.code) {
      // TODO default shader?
      shaders.compute.code = ''
    }

    if (!shaders.compute.entryPoint) {
      shaders.compute.entryPoint = 'main'
    }

    this.options.shaders = shaders
    this.options.works = works

    this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
      label: this.options.label + ' compute pipeline',
      shaders: this.options.shaders,
    })

    this.setWorkGroups()
  }

  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      bindGroups: this.bindGroups,
    })
  }

  setWorkGroups() {
    this.workBindGroups = []
    this.works = {}
    this.inputsBindings = [...this.inputsBindings, ...this.options.works]

    if (this.options.works.length) {
      const workBindGroup = new WorkBindGroup({
        label: this.options.label + ': Work bind group',
        renderer: this.renderer,
      })

      this.options.works.forEach((workBinding) => {
        this.works = { ...this.works, ...workBinding.bindings }

        workBinding.isActive = this.options.shaders.compute.code.indexOf(workBinding.name) !== -1

        workBindGroup.addBinding(workBinding)
      })

      this.workBindGroups.push(workBindGroup)
    }

    this.inputsBindGroups = [...this.inputsBindGroups, ...this.workBindGroups]
  }

  setMaterial() {
    super.setMaterial()

    if (this.pipelineEntry && !this.pipelineEntry.pipeline) {
      this.setPipelineEntryBuffers()
    }
  }

  /** BIND GROUPS **/

  createBindGroups() {
    super.createBindGroups()

    this.workBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }

  destroyBindGroups() {
    super.destroyBindGroups()
    this.workBindGroups = []
  }

  get hasMappedBuffer() {
    // check if we have a buffer mapped or pending map
    const hasMappedBuffer = this.workBindGroups.some((workBindGroup) => {
      return workBindGroup.bindingsBuffers.some((bindingBuffer) => bindingBuffer.resultBuffer.mapState !== 'unmapped')
    })

    return !!hasMappedBuffer
  }

  /**
   *
   * @param pass
   */
  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    // pipeline is not ready yet
    if (!this.ready) return

    // set current pipeline
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry)

    // set bind groups
    this.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)

      if (bindGroup.type === 'WorkBindGroup') {
        bindGroup.bindings.forEach((binding) => {
          pass.dispatchWorkgroups(binding.value.length)
        })
      }
    })
  }

  copyBufferToResult(commandEncoder) {
    this.workBindGroups.forEach((workBindGroup) => {
      workBindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        commandEncoder.copyBufferToBuffer(
          bindingBuffer.buffer,
          0,
          bindingBuffer.resultBuffer,
          0,
          bindingBuffer.resultBuffer.size
        )
      })
    })
  }

  setWorkGroupsResult() {
    this.workBindGroups.forEach((workBindGroup) => {
      workBindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        this.setBufferResult(bindingBuffer)
      })
    })
  }

  setBufferResult(bindingBuffer) {
    if (bindingBuffer.resultBuffer.mapState === 'unmapped') {
      bindingBuffer.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
        bindingBuffer.inputBinding.result = new Float32Array(bindingBuffer.resultBuffer.getMappedRange().slice(0))
        bindingBuffer.resultBuffer.unmap()
      })
    }
  }

  getWorkGroupResult(name = '') {
    let bindingBuffer
    this.workBindGroups.forEach((workBindGroup) => {
      bindingBuffer = workBindGroup.bindingsBuffers.find((bindingBuffer) => bindingBuffer.inputBinding.name === name)
    })

    if (bindingBuffer) {
      return bindingBuffer.inputBinding.result
    } else {
      return null
    }
  }
}
