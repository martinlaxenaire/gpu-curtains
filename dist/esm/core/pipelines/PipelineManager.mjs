import { RenderPipelineEntry } from './RenderPipelineEntry.mjs';
import { ComputePipelineEntry } from './ComputePipelineEntry.mjs';
import { compareRenderingOptions } from '../materials/utils.mjs';

class PipelineManager {
  constructor() {
    this.type = "PipelineManager";
    this.currentPipelineIndex = null;
    this.pipelineEntries = [];
  }
  /**
   * Compare two {@link ShaderOptions | shader objects}
   * @param shaderA - first {@link ShaderOptions | shader object} to compare
   * @param shaderB - second {@link ShaderOptions | shader object} to compare
   * @returns - whether the two {@link ShaderOptions | shader objects} code and entryPoint match
   */
  compareShaders(shaderA, shaderB) {
    return shaderA.code?.localeCompare(shaderB.code) === 0 && shaderA.entryPoint === shaderB.entryPoint;
  }
  /**
   * Checks if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters) {
    return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
      const { options } = pipelineEntry;
      const { shaders, rendering } = parameters;
      const sameVertexShader = this.compareShaders(shaders.vertex, options.shaders.vertex);
      const sameFragmentShader = !shaders.fragment && !options.shaders.fragment || this.compareShaders(shaders.fragment, options.shaders.fragment);
      const differentParams = compareRenderingOptions(rendering, options.rendering);
      return !differentParams.length && sameVertexShader && sameFragmentShader;
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
      return this.compareShaders(shaders.compute, options.shaders.compute);
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
