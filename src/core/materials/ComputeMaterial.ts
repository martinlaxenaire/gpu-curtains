import { Material } from './Material'
import { MaterialParams } from '../../types/Materials'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry'
import { BindGroupBindingBuffer, WorkInputBindingsParams } from '../../types/BindGroups'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

/**
 * ComputeMaterial class:
 * Create a Material specifically built to run computations on the GPU with a {@see ComputePass}
 * @extends Material
 */
export class ComputeMaterial extends Material {
  pipelineEntry: ComputePipelineEntry

  /**
   * ComputeMaterial constructor
   * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
   * @param {MaterialParams} parameters - parameters used to create our Material
   * @param {string} parameters.label - ComputeMaterial label
   * @param {boolean} parameters.useAsyncPipeline - whether the {@see ComputePipelineEntry} should be compiled asynchronously
   * @param {MaterialShaders} parameters.shaders - our ComputeMaterial shader codes and entry points
   * @param {BindGroupInputs} parameters.inputs - our ComputeMaterial {@see BindGroup} inputs
   * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
   * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
   */
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

  /**
   * When all bind groups are created, add them to the {@see ComputePipelineEntry} and compile it
   */
  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      bindGroups: this.bindGroups,
    })
  }

  /**
   * Check if all bind groups are ready, create them if needed and set {@see ComputePipelineEntry} bind group buffers
   */
  setMaterial() {
    super.setMaterial()

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryBuffers()
    }
  }

  /** BIND GROUPS **/

  /**
   * Check whether we're currently accessing one of the buffer and therefore can't render our material
   * @readonly
   * @type {boolean}
   */
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
   * Render the material if it is ready:
   * Set the current pipeline, set the bind groups and dispatch the work groups
   * @param {GPUComputePassEncoder} pass
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

  /**
   * Copy all writable binding buffers that need it
   * @param {GPUCommandEncoder} commandEncoder
   */
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

  /**
   * Loop through all bind groups writable buffers and check if they need to be copied
   */
  setWorkGroupsResult() {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindingsBuffers.forEach((bindingBuffer) => {
        if ((bindingBuffer.inputBinding as WorkBufferBindings).shouldCopyResult) {
          this.setBufferResult(bindingBuffer)
        }
      })
    })
  }

  /**
   * Copy the result buffer into our result array
   * @param {BindGroupBindingBuffer} bindingBuffer
   */
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

  /**
   * Get the result of work group by work group and binding names
   * @param {string=} workGroupName
   * @param {string=} bindingName
   * @returns {?Float32Array} - the result of our GPU compute pass
   */
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
