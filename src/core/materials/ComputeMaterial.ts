import { Material } from './Material'
import { MaterialParams } from '../../types/core/materials/Material'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry'
import { BindGroupBindingBuffer, WorkInputBindingsParams } from '../../types/core/bindGroups/BindGroup'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

export class ComputeMaterial extends Material {
  pipelineEntry: ComputePipelineEntry

  constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'ComputeMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    let { shaders } = parameters

    if (!shaders || !shaders.compute) {
      shaders = {
        compute: {
          code: '',
          entryPoint: 'main',
        },
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

  get hasMappedBuffer(): boolean {
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
  render(pass: GPUComputePassEncoder) {
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
        if ('dispatchSize' in binding) {
          pass.dispatchWorkgroups(binding.dispatchSize[0], binding.dispatchSize[1], binding.dispatchSize[2])
        }
      })
    })
  }

  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        if ('shouldCopyResult' in bindingBuffer.inputBinding && bindingBuffer.inputBinding.shouldCopyResult) {
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
        if ((bindingBuffer.inputBinding as WorkBufferBindings).shouldCopyResult) {
          this.setBufferResult(bindingBuffer)
        }
      })
    })
  }

  setBufferResult(bindingBuffer: BindGroupBindingBuffer) {
    if (bindingBuffer.resultBuffer?.mapState === 'unmapped') {
      bindingBuffer.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
        ;(bindingBuffer.inputBinding as WorkBufferBindings).result = new Float32Array(
          bindingBuffer.resultBuffer.getMappedRange().slice(0)
        )
        bindingBuffer.resultBuffer.unmap()
      })
    }
  }

  getWorkGroupResult({
    workGroupName = '',
    bindingName = '',
  }: {
    workGroupName?: string
    bindingName?: string
  }): Float32Array {
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
