import { Material } from './Material'
import { ComputeMaterialOptions, ComputeMaterialParams, FullShadersType } from '../../types/Materials'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry'
import { WritableBufferBinding } from '../bindings/WritableBufferBinding'

/**
 * Create a {@link Material} specifically built to run computations on the GPU. Internally used by {@link core/computePasses/ComputePass.ComputePass | ComputePass}.
 *
 * ## Compute pipeline
 *
 * A {@link ComputeMaterial} automatically creates a {@link ComputePipelineEntry}. Once all the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} have been created, they are sent with the compute shader code to the {@link ComputePipelineEntry}, which is in turns responsible for creating the {@link GPUComputePipeline}.
 *
 * After the {@link GPUComputePipeline} has been successfully compiled, the {@link ComputeMaterial} is considered to be ready and it can start running the compute shader computations.
 *
 */
export class ComputeMaterial extends Material {
  /** {@link ComputePipelineEntry | Compute pipeline entry} used by this {@link ComputeMaterial}. */
  pipelineEntry: ComputePipelineEntry
  /** Options used to create this {@link ComputeMaterial}. */
  options: ComputeMaterialOptions

  /** Default work group dispatch size to use with this {@link ComputeMaterial}. */
  dispatchSize?: number | number[]

  /** function assigned to the {@link useCustomRender} callback. */
  _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void

  /**
   * ComputeMaterial constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeMaterial}.
   * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputeMaterialParams) {
    const type = 'ComputeMaterial'

    renderer = isRenderer(renderer, type)

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
  }

  /**
   * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link ComputePipelineEntry} from cache or if we should create a new one.
   */
  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline(this)
  }

  /**
   * Compile the {@link ComputePipelineEntry}.
   */
  async compilePipelineEntry(): Promise<void> {
    await this.pipelineEntry.compilePipelineEntry()
  }

  /**
   * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline.
   */
  async compileMaterial(): Promise<void> {
    if (this.ready) return

    super.compileMaterial()

    if (!this.pipelineEntry) {
      this.setPipelineEntry()
    }

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry()
    }
  }

  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="compute"] - Shader to get the code from.
   * @returns - The corresponding shader code.
   */
  async getShaderCode(shaderType: FullShadersType = 'compute'): Promise<string> {
    return await super.getShaderCode(shaderType)
  }

  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="compute"] - Shader to get the code from
   * @returns - The corresponding shader code
   */
  async getAddedShaderCode(shaderType: FullShadersType = 'compute'): Promise<string> {
    return await super.getAddedShaderCode(shaderType)
  }

  /* RENDER */

  /**
   * If a custom render function has been defined instead of the default one, register the callback
   * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
   */
  useCustomRender(callback: (pass: GPUComputePassEncoder) => void) {
    if (callback) {
      this._useCustomRenderCallback = callback
    }
  }

  /**
   * Render the material if it is ready:
   * Set the current pipeline, set the bind groups and dispatch the work groups.
   * @param pass - Current compute pass encoder.
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
      for (const bindGroup of this.bindGroups) {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
      }
      //this.renderer.pipelineManager.setActiveBindGroups(pass, this.bindGroups)

      pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2])
    }
  }

  /* RESULT BUFFER */

  /**
   * Copy all writable binding buffers that need it.
   * @param commandEncoder - Current command encoder.
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    for (const bindGroup of this.bindGroups) {
      bindGroup.bufferBindings.forEach((binding: WritableBufferBinding) => {
        if (binding.shouldCopyResult) {
          this.renderer.copyBufferToBuffer({
            srcBuffer: binding.buffer,
            dstBuffer: binding.resultBuffer,
            commandEncoder,
          })
        }
      })
    }
  }

  /**
   * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
   * @param parameters - Parameters used to get the result.
   * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
   * @param parameters.bufferElementName - Pptional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
   * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
   */
  async getComputeResult({
    bindingName = '',
    bufferElementName = '',
  }: {
    bindingName?: string
    bufferElementName?: string
  }): Promise<Float32Array> {
    const binding = this.getBufferBindingByName(bindingName)

    if (binding && 'resultBuffer' in binding) {
      const result = await this.getBufferResult(binding.resultBuffer)

      if (bufferElementName && result.length) {
        return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName })
      } else {
        return result
      }
    } else {
      return new Float32Array(0)
    }
  }
}
