import { RenderPipelineEntry } from './RenderPipelineEntry.mjs';
import { ComputePipelineEntry } from './ComputePipelineEntry.mjs';

class PipelineManager {
  constructor() {
    this.type = "PipelineManager";
    this.currentPipelineIndex = null;
    this.pipelineEntries = [];
  }
  /**
   * Checks if the provided {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters) {
    const {
      shaders,
      cullMode,
      depth,
      depthWriteEnabled,
      depthCompare,
      transparent,
      verticesOrder,
      topology,
      sampleCount
    } = parameters;
    return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
      const { options } = pipelineEntry;
      const sameFragmentShader = !shaders.fragment && !options.shaders.fragment || shaders.fragment.code?.localeCompare(options.shaders.fragment.code) === 0 && shaders.fragment.entryPoint === options.shaders.fragment.entryPoint;
      return shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 && shaders.vertex.entryPoint === options.shaders.vertex.entryPoint && sameFragmentShader && cullMode === options.cullMode && depth === options.depth && depthWriteEnabled === options.depthWriteEnabled && depthCompare === options.depthCompare && transparent === options.transparent && sampleCount === options.sampleCount && verticesOrder === options.verticesOrder && topology === options.topology;
    });
  }
  /**
   * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - {@link RenderPipelineEntry}, either from cache or newly created
   */
  createRenderPipeline(parameters) {
    const existingPipelineEntry = this.isSameRenderPipeline(parameters);
    if (existingPipelineEntry) {
      return existingPipelineEntry;
    } else {
      const pipelineEntry = new RenderPipelineEntry(parameters);
      this.pipelineEntries.push(pipelineEntry);
      return pipelineEntry;
    }
  }
  /**
   * Checks if the provided {@link PipelineEntryParams | parameters} belongs to an already created {@link ComputePipelineEntry}.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - the found {@link ComputePipelineEntry}, or null if not found
   */
  isSameComputePipeline(parameters) {
    const { shaders } = parameters;
    return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof ComputePipelineEntry).find((pipelineEntry) => {
      const { options } = pipelineEntry;
      return shaders.compute.code.localeCompare(options.shaders.compute.code) === 0 && shaders.compute.entryPoint === options.shaders.compute.entryPoint;
    });
  }
  /**
   * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - newly created {@link ComputePipelineEntry}
   */
  createComputePipeline(parameters) {
    const existingPipelineEntry = this.isSameComputePipeline(parameters);
    if (existingPipelineEntry) {
      return existingPipelineEntry;
    } else {
      const pipelineEntry = new ComputePipelineEntry(parameters);
      this.pipelineEntries.push(pipelineEntry);
      return pipelineEntry;
    }
  }
  /**
   * Check if the given {@link AllowedPipelineEntries | PipelineEntry} is already set, if not set it
   * @param pass - current pass encoder
   * @param pipelineEntry - the {@link AllowedPipelineEntries | PipelineEntry} to set
   */
  setCurrentPipeline(pass, pipelineEntry) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline);
      this.currentPipelineIndex = pipelineEntry.index;
    }
  }
  /**
   * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
   */
  resetCurrentPipeline() {
    this.currentPipelineIndex = null;
  }
}

export { PipelineManager };
//# sourceMappingURL=PipelineManager.mjs.map
