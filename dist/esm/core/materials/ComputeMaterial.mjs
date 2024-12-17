import { Material } from './Material.mjs';
import { isRenderer } from '../renderers/utils.mjs';

class ComputeMaterial extends Material {
  /**
   * ComputeMaterial constructor
   * @param renderer - our {@link Renderer} class object
   * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}
   */
  constructor(renderer, parameters) {
    const type = "ComputeMaterial";
    renderer = isRenderer(renderer, type);
    super(renderer, parameters);
    this.type = type;
    this.renderer = renderer;
    let { shaders, dispatchSize } = parameters;
    if (!shaders || !shaders.compute) {
      shaders = {
        compute: {
          code: "",
          entryPoint: "main"
        }
      };
    }
    if (!shaders.compute.code) {
      shaders.compute.code = "@compute @workgroup_size(1) fn main(){}";
    }
    if (!shaders.compute.entryPoint) {
      shaders.compute.entryPoint = "main";
    }
    this.options = {
      ...this.options,
      shaders,
      ...parameters.dispatchSize !== void 0 && { dispatchSize: parameters.dispatchSize }
    };
    if (!dispatchSize) {
      dispatchSize = 1;
    }
    if (Array.isArray(dispatchSize)) {
      dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1);
      dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1);
      dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1);
    } else if (!isNaN(dispatchSize)) {
      dispatchSize = [Math.ceil(dispatchSize), 1, 1];
    }
    this.dispatchSize = dispatchSize;
  }
  /**
   * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link ComputePipelineEntry} from cache or if we should create a new one.
   */
  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline(this);
  }
  /**
   * Compile the {@link ComputePipelineEntry}
   * @async
   */
  async compilePipelineEntry() {
    await this.pipelineEntry.compilePipelineEntry();
  }
  /**
   * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline
   * @async
   */
  async compileMaterial() {
    if (this.ready)
      return;
    super.compileMaterial();
    if (!this.pipelineEntry) {
      this.setPipelineEntry();
    }
    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      await this.compilePipelineEntry();
    }
  }
  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="compute"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getShaderCode(shaderType = "compute") {
    return super.getShaderCode(shaderType);
  }
  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="compute"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getAddedShaderCode(shaderType = "compute") {
    return super.getAddedShaderCode(shaderType);
  }
  /* RENDER */
  /**
   * If a custom render function has been defined instead of the default one, register the callback
   * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
   */
  useCustomRender(callback) {
    if (callback) {
      this._useCustomRenderCallback = callback;
    }
  }
  /**
   * Render the material if it is ready:
   * Set the current pipeline, set the bind groups and dispatch the work groups
   * @param pass - current compute pass encoder
   */
  render(pass) {
    if (!this.ready)
      return;
    this.setPipeline(pass);
    if (this._useCustomRenderCallback !== void 0) {
      this._useCustomRenderCallback(pass);
    } else {
      for (const bindGroup of this.bindGroups) {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
      }
      pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2]);
    }
  }
  /* RESULT BUFFER */
  /**
   * Copy all writable binding buffers that need it
   * @param commandEncoder - current command encoder
   */
  copyBufferToResult(commandEncoder) {
    for (const bindGroup of this.bindGroups) {
      bindGroup.bufferBindings.forEach((binding) => {
        if (binding.shouldCopyResult) {
          this.renderer.copyBufferToBuffer({
            srcBuffer: binding.buffer,
            dstBuffer: binding.resultBuffer,
            commandEncoder
          });
        }
      });
    }
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
    bindingName = "",
    bufferElementName = ""
  }) {
    const binding = this.getBufferBindingByName(bindingName);
    if (binding && "resultBuffer" in binding) {
      const result = await this.getBufferResult(binding.resultBuffer);
      if (bufferElementName && result.length) {
        return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
      } else {
        return result;
      }
    } else {
      return new Float32Array(0);
    }
  }
}

export { ComputeMaterial };
