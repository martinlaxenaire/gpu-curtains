import { Material } from './Material'
import { ComputeMaterialOptions, ComputeMaterialParams, FullShadersType } from '../../types/Materials'
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

  /** Default work group dispatch size to use with this {@link ComputeMaterial} */
  dispatchSize?: number | number[]

  /** function assigned to the [useCustomRender]{@link ComputeMaterial#useCustomRender} callback */
  _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void

  /**
   * ComputeMaterial constructor
   * @param renderer - our [renderer]{@link Renderer} class object
   * @param parameters - [parameters]{@link ComputeMaterialParams} used to create our {@link ComputeMaterial}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputeMaterialParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'ComputeMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    let { shaders, dispatchSize } = parameters

    if (!shaders || !shaders.compute) {
      shaders = {
        compute: {
          code: '',
          entryPoint: 'main',
        },
      }
    }

    if (!shaders.compute.code) {
      shaders.compute.code = '@compute @workgroup_size(1) fn main(){}'
    }

    if (!shaders.compute.entryPoint) {
      shaders.compute.entryPoint = 'main'
    }

    this.options = {
      ...this.options,
      shaders,
      ...(parameters.dispatchSize !== undefined && { dispatchSize: parameters.dispatchSize }),
    }

    // set default dispatch size
    if (Array.isArray(dispatchSize)) {
      dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1)
      dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1)
      dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1)
    } else if (!isNaN(dispatchSize)) {
      dispatchSize = [Math.ceil(dispatchSize), 1, 1]
    }

    this.dispatchSize = dispatchSize

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

  /* RENDER */

  /**
   * If we defined a custom render function instead of the default one, register the callback
   * @param callback - callback to run instead of the default behaviour, which is to set the [bind groups]{@link ComputeMaterial#bindGroups} and dispatch the work groups based on the [default dispatch size]{@link ComputeMaterial#dispatchSize}
   */
  useCustomRender(callback: (pass: GPUComputePassEncoder) => void) {
    if (callback) {
      this._useCustomRenderCallback = callback
    }
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

    // if we declared a custom render function, call it
    if (this._useCustomRenderCallback !== undefined) {
      this._useCustomRenderCallback(pass)
    } else {
      // else just set our bind groups and dispatch
      this.bindGroups.forEach((bindGroup) => {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
      })

      pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2])
    }
  }

  /* RESULT BUFFER */

  // TODO should we get rid of all that part?

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
        const bufferElement = binding.bufferElements.find((bufferElement) => bufferElement.name === bindingName)

        if (bufferElement) {
          return binding.result.slice(bufferElement.startOffset, bufferElement.endOffset)
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
