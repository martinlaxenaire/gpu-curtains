import { Material } from './Material'
import { isRenderer } from '../../utils/renderer-utils'
import { BufferBindings } from '../bindings/BufferBindings'
import { toKebabCase } from '../../utils/utils'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

export class ComputeMaterial extends Material {
  constructor(renderer, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    const type = 'ComputeMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    let { shaders } = parameters

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

    this.options = {
      ...this.options,
      shaders,
    }

    this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
      label: this.options.label + ' compute pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
    })
  }

  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      bindGroups: this.bindGroups,
    })
  }

  setMaterial() {
    super.setMaterial()

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryBuffers()
    }
  }

  /** BIND GROUPS **/

  get hasMappedBuffer() {
    // check if we have a buffer mapped or pending map
    const hasMappedBuffer = this.bindGroups.some((bindGroup) => {
      return bindGroup.bindingsBuffers.some(
        (bindingBuffer) => bindingBuffer.resultBuffer && bindingBuffer.resultBuffer.mapState !== 'unmapped'
      )
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

      bindGroup.bindings.forEach((binding) => {
        if (binding.dispatchSize) {
          pass.dispatchWorkgroups(binding.dispatchSize[0], binding.dispatchSize[1], binding.dispatchSize[2])
        }
      })
    })
  }

  copyBufferToResult(commandEncoder) {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        if (bindingBuffer.inputBinding.shouldCopyResult) {
          commandEncoder.copyBufferToBuffer(
            bindingBuffer.buffer,
            0,
            bindingBuffer.resultBuffer,
            0,
            bindingBuffer.resultBuffer.size
          )
        }
      })
    })
  }

  setWorkGroupsResult() {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        if (bindingBuffer.inputBinding.shouldCopyResult) {
          this.setBufferResult(bindingBuffer)
        }
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

  getWorkGroupResult({ workGroupName = '', bindingName = '' }) {
    let bindingBuffer
    this.bindGroups.forEach((bindGroup) => {
      bindingBuffer = bindGroup.bindingsBuffers.find(
        (bindingBuffer) => bindingBuffer.inputBinding.name === workGroupName
      )
    })

    if (bindingBuffer) {
      if (bindingName) {
        const bindingElement = bindingBuffer.inputBinding.bindingElements.find(
          (bindingElement) => bindingElement.name === bindingName
        )

        if (bindingElement) {
          return bindingBuffer.inputBinding.result.slice(bindingElement.startOffset, bindingElement.endOffset)
        } else {
          return bindingBuffer.inputBinding.result.slice()
        }
      } else {
        return bindingBuffer.inputBinding.result.slice()
      }
    } else {
      return null
    }
  }
}
