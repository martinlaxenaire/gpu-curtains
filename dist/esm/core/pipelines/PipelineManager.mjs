import { RenderPipelineEntry } from './RenderPipelineEntry.mjs';
import { ComputePipelineEntry } from './ComputePipelineEntry.mjs';
import { compareRenderingOptions } from '../materials/utils.mjs';

class PipelineManager {
  constructor() {
    this.type = "PipelineManager";
    this.currentPipelineIndex = null;
    this.pipelineEntries = [];
    this.activeBindGroups = [];
  }
  /**
   * Compare two {@link ShaderOptions | shader objects}
   * @param shaderA - first {@link ShaderOptions | shader object} to compare
   * @param shaderB - second {@link ShaderOptions | shader object} to compare
   * @returns - whether the two {@link ShaderOptions | shader objects} code and entryPoint match
   */
  compareShaders(shaderA, shaderB) {
    return shaderA.code === shaderB.code && shaderA.entryPoint === shaderB.entryPoint;
  }
  /**
   * Checks if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters) {
    return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
      const { options } = pipelineEntry;
      const { shaders, rendering, cacheKey } = parameters;
      const sameCacheKey = cacheKey === options.cacheKey;
      const sameVertexShader = this.compareShaders(shaders.vertex, options.shaders.vertex);
      const sameFragmentShader = !shaders.fragment && !options.shaders.fragment || this.compareShaders(shaders.fragment, options.shaders.fragment);
      const differentParams = compareRenderingOptions(rendering, options.rendering);
      return sameCacheKey && !differentParams.length && sameVertexShader && sameFragmentShader;
    });
  }
  /**
   * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - {@link RenderPipelineEntry}, either from cache or newly created
   */
  createRenderPipeline(parameters) {
    const { attributes, bindGroups } = parameters;
    let cacheKey = attributes.layoutCacheKey;
    bindGroups.forEach((bindGroup) => {
      bindGroup.bindings.forEach((binding) => {
        cacheKey += binding.name + ",";
      });
      cacheKey += bindGroup.layoutCacheKey;
    });
    const existingPipelineEntry = this.isSameRenderPipeline({ ...parameters, cacheKey });
    if (existingPipelineEntry) {
      return existingPipelineEntry;
    } else {
      const pipelineEntry = new RenderPipelineEntry({ ...parameters, cacheKey });
      this.pipelineEntries.push(pipelineEntry);
      return pipelineEntry;
    }
  }
  /**
   * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - newly created {@link ComputePipelineEntry}
   */
  createComputePipeline(parameters) {
    const pipelineEntry = new ComputePipelineEntry(parameters);
    this.pipelineEntries.push(pipelineEntry);
    return pipelineEntry;
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
   * Track the active/already set {@link core/bindGroups/BindGroup.BindGroup | bind groups} to avoid `setBindGroup()` redundant calls.
   * @param pass - current pass encoder.
   * @param bindGroups - array {@link core/bindGroups/BindGroup.BindGroup | bind groups} passed by the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
   */
  setActiveBindGroups(pass, bindGroups) {
    bindGroups.forEach((bindGroup, index) => {
      if (!this.activeBindGroups[index] || this.activeBindGroups[index].uuid !== bindGroup.uuid || this.activeBindGroups[index].index !== bindGroup.index) {
        this.activeBindGroups[index] = bindGroup;
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
      }
    });
  }
  /**
   * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} and {@link activeBindGroups} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
   */
  resetCurrentPipeline() {
    this.currentPipelineIndex = null;
    this.activeBindGroups = [];
  }
}

export { PipelineManager };
