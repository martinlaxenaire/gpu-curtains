import { Material } from './Material'
import {
  ComputeMaterialOptions,
  ComputeMaterialParams,
  ComputeMaterialWorkGroup,
  ComputeMaterialWorkGroupParams,
  FullShadersType,
  MaterialParams,
} from '../../types/Materials'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry'
import { WritableBufferBinding } from '../bindings/WritableBufferBinding'

/**
 * ComputeMaterial class:
 * Create a Material specifically built to run computations on the GPU with a {@link ComputePass}
 * @extends Material
 */
export class ComputeMaterial extends Material {
  /** [Compute pipeline entry]{@link ComputePipelineEntry} used by this {@link ComputeMaterial} */
  pipelineEntry: ComputePipelineEntry
  /** Options used to create this {@link ComputeMaterial} */
  options: ComputeMaterialOptions
  /** Array of [work groups]{@link ComputeMaterialWorkGroup} to render each time the [render]{@link ComputeMaterial#render} method is called */
  workGroups: ComputeMaterialWorkGroup[]

  /**
   * ComputeMaterial constructor
   * @param renderer - our renderer class object
   * @param parameters - parameters used to create our Material
   * @param {string} parameters.label - ComputeMaterial label
   * @param {boolean} parameters.useAsyncPipeline - whether the {@link ComputePipelineEntry} should be compiled asynchronously
   * @param {MaterialShaders} parameters.shaders - our ComputeMaterial shader codes and entry points
   * @param {BindGroupInputs} parameters.inputs - our ComputeMaterial {@link BindGroup} inputs
   * @param {BindGroup[]} parameters.bindGroups - already created {@link BindGroup} to use
   * @param {Sampler[]} parameters.samplers - array of {@link Sampler}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputeMaterialParams) {
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
      ...(parameters.dispatchSize !== undefined && { dispatchSize: parameters.dispatchSize }),
    }

    this.workGroups = []

    // add main work group right now
    this.addWorkGroup({
      bindGroups: this.bindGroups,
      dispatchSize: this.options.dispatchSize,
    })

    this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
      renderer: this.renderer,
      label: this.options.label + ' compute pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
    })
  }

  /**
   * When all bind groups are created, add them to the {@link ComputePipelineEntry}
   */
  setPipelineEntryProperties() {
    this.pipelineEntry.setPipelineEntryProperties({
      bindGroups: this.bindGroups,
    })
  }

  /**
   * Compile the {@link ComputePipelineEntry}
   * @async
   */
  async compilePipelineEntry(): Promise<void> {
    await this.pipelineEntry.compilePipelineEntry()
  }

  /**
   * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline
   * @async
   */
  async compileMaterial() {
    super.compileMaterial()

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryProperties()
      await this.compilePipelineEntry()
    }
  }

  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="compute"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getShaderCode(shaderType: FullShadersType = 'compute'): string {
    return super.getShaderCode(shaderType)
  }

  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="compute"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getAddedShaderCode(shaderType: FullShadersType = 'compute'): string {
    return super.getAddedShaderCode(shaderType)
  }

  /* BIND GROUPS */

  /**
   * Check whether we're currently accessing one of the buffer and therefore can't render our material
   * @readonly
   */
  get hasMappedBuffer(): boolean {
    // check if we have a buffer mapped or pending map
    const hasMappedBuffer = this.bindGroups.some((bindGroup) => {
      return bindGroup.bindings.some(
        (bindingBuffer: WritableBufferBinding) =>
          bindingBuffer.resultBuffer && bindingBuffer.resultBuffer.mapState !== 'unmapped'
      )
    })

    return !!hasMappedBuffer
  }

  /* WORK GROUPS */

  /**
   * Add a new [work group]{@link ComputeMaterial#workGroups} to render each frame.
   * A [work group]{@link ComputeMaterial#workGroups} is composed of an array of [bind groups][@link BindGroup] to set and a dispatch size to dispatch the [work group]{@link ComputeMaterial#workGroups}
   * @param bindGroups
   * @param dispatchSize
   */
  addWorkGroup({ bindGroups = [], dispatchSize = 1 }: ComputeMaterialWorkGroupParams) {
    if (Array.isArray(dispatchSize)) {
      dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1)
      dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1)
      dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1)
    } else if (!isNaN(dispatchSize)) {
      dispatchSize = [Math.ceil(dispatchSize), 1, 1]
    }

    this.workGroups.push({
      bindGroups,
      dispatchSize,
    } as ComputeMaterialWorkGroup)
  }

  /* RENDER */

  /**
   * Render a [work group]{@link ComputeMaterial#workGroups}: set its bind groups and then dispatch using its dispatch size
   * @param pass - current compute pass encoder
   * @param workGroup - [Work group]{@link ComputeMaterial#workGroups} to render
   */
  renderWorkGroup(pass: GPUComputePassEncoder, workGroup: ComputeMaterialWorkGroup) {
    workGroup.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
    })

    pass.dispatchWorkgroups(workGroup.dispatchSize[0], workGroup.dispatchSize[1], workGroup.dispatchSize[2])
  }

  /**
   * Render the material if it is ready:
   * Set the current pipeline, and render all the [work groups]{@link ComputeMaterial#workGroups}
   * @param pass - current compute pass encoder
   */
  render(pass: GPUComputePassEncoder) {
    // renderer or pipeline are not ready yet
    // not really needed since compute passes do already check it beforehand
    // mostly here as a safeguard
    if (!this.ready) return

    // set current pipeline
    this.setPipeline(pass)

    // render our work groups
    this.workGroups.forEach((workGroup) => {
      this.renderWorkGroup(pass, workGroup)
    })
  }

  /* RESULT BUFFER */

  /**
   * Copy all writable binding buffers that need it
   * @param commandEncoder - current command encoder
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindings.forEach((binding: WritableBufferBinding) => {
        if ('shouldCopyResult' in binding && binding.shouldCopyResult) {
          commandEncoder.copyBufferToBuffer(binding.buffer, 0, binding.resultBuffer, 0, binding.resultBuffer.size)
        }
      })
    })
  }

  /**
   * Loop through all bind groups writable buffers and check if they need to be copied
   */
  setWorkGroupsResult() {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindings.forEach((binding: WritableBufferBinding) => {
        if (binding.shouldCopyResult) {
          this.setBufferResult(binding)
        }
      })
    })
  }

  /**
   * Copy the result buffer into our result array
   * @param binding - buffer binding to set the result from
   */
  setBufferResult(binding: WritableBufferBinding) {
    if (binding.resultBuffer?.mapState === 'unmapped') {
      binding.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
        binding.result = new Float32Array(binding.resultBuffer.getMappedRange().slice(0))
        binding.resultBuffer.unmap()
      })
    }
  }

  /**
   * Get the result of work group by work group and binding names
   * @param workGroupName - work group name/key
   * @param bindingName - binding name/key
   * @returns - the result of our GPU compute pass
   */
  getWorkGroupResult({
    workGroupName = '',
    bindingName = '',
  }: {
    workGroupName?: string
    bindingName?: string
  }): Float32Array {
    let binding
    this.bindGroups.forEach((bindGroup) => {
      binding = bindGroup.bindings.find((binding) => binding.name === workGroupName)
    })

    if (binding) {
      if (bindingName) {
        const bindingElement = binding.bindingElements.find((bindingElement) => bindingElement.name === bindingName)

        if (bindingElement) {
          return binding.result.slice(bindingElement.startOffset, bindingElement.endOffset)
        } else {
          return binding.result.slice()
        }
      } else {
        return binding.result.slice()
      }
    } else {
      return null
    }
  }
}
