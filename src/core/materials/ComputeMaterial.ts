import { Material } from './Material'
import { ComputeMaterialOptions, ComputeMaterialParams, FullShadersType } from '../../types/Materials'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry'
import { WritableBufferBinding } from '../bindings/WritableBufferBinding'

/**
 * Create a Material specifically built to run computations on the GPU with a {@link core/computePasses/ComputePass.ComputePass | ComputePass}
 */
export class ComputeMaterial extends Material {
  /** {@link ComputePipelineEntry | Compute pipeline entry} used by this {@link ComputeMaterial} */
  pipelineEntry: ComputePipelineEntry
  /** Options used to create this {@link ComputeMaterial} */
  options: ComputeMaterialOptions

  /** Default work group dispatch size to use with this {@link ComputeMaterial} */
  dispatchSize?: number | number[]

  /** function assigned to the {@link useCustomRender} callback */
  _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void

  /**
   * ComputeMaterial constructor
   * @param renderer - our {@link Renderer} class object
   * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}
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
    if (!dispatchSize) {
      dispatchSize = 1
    }

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

  /* RENDER */

  /**
   * If we defined a custom render function instead of the default one, register the callback
   * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}
   */
  useCustomRender(callback: (pass: GPUComputePassEncoder) => void) {
    if (callback) {
      this._useCustomRenderCallback = callback
    }
  }

  /**
   * Render the material if it is ready:
   * Set the current pipeline, set the bind groups and dispatch the work groups
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

  /**
   * Copy all writable binding buffers that need it
   * @param commandEncoder - current command encoder
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bufferBindings.forEach((binding: WritableBufferBinding) => {
        if (binding.shouldCopyResult && binding.resultBuffer.mapState === 'unmapped') {
          commandEncoder.copyBufferToBuffer(binding.buffer, 0, binding.resultBuffer, 0, binding.resultBuffer.size)
        }
      })
    })
  }

  /**
   * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
   * @param parameters - parameters used to get the result
   * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
   * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
   * @async
   * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
   */
  async getComputeResult({
    bindingName = '',
    bufferElementName = '',
  }: {
    bindingName?: string
    bufferElementName?: string
  }): Promise<Float32Array> {
    const binding = this.getBufferBindingByName(bindingName)

    if (binding && 'resultBuffer' in binding && binding.resultBuffer.mapState === 'unmapped') {
      const result = await this.getBufferResult(binding.resultBuffer)

      if (bufferElementName) {
        return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName })
      } else {
        return result
      }
    } else {
      return new Float32Array(0)
    }
  }
}
