import { RenderPipelineEntry } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import { PipelineEntryParams, RenderPipelineEntryParams } from '../../types/PipelineEntries'
import { ShaderOptions } from '../../types/Materials'
import { compareRenderingOptions } from '../materials/utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { RenderMaterial } from '../materials/RenderMaterial'
import { ComputeMaterial } from '../materials/ComputeMaterial'

/** Defines all types of allowed {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} class objects */
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

/** Defines all the types of render passes allowed. */
export type GPURenderPassTypes = GPURenderPassEncoder | GPURenderBundleEncoder
/** Defines all the types of passes allowed. */
export type GPUPassTypes = GPURenderPassTypes | GPUComputePassEncoder

/**
 * Used to create and keep track of both {@link ComputePipelineEntry} and {@link RenderPipelineEntry}.<br>
 * Perform checks to eventually use a cached pipeline entry instead of creating a new one.<br>
 * The end goal is to cache pipelines and reuse them (as well as bind groups).<br>
 * Also responsible for setting the current pass encoder pipeline in order to avoid redundant setPipeline calls.<br>
 * Created internally by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager | GPUDeviceManager}.<br>
 * @see {@link https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change | WebGPU Bind Group best practices}
 */
export class PipelineManager {
  /** The type of the {@link PipelineManager} */
  type: string
  /** Keep track of the current bound pipeline in order to avoid redundant setPipeline calls */
  currentPipelineIndex: number | null
  /** Array of already created {@link ComputePipelineEntry} and {@link RenderPipelineEntry} */
  pipelineEntries: AllowedPipelineEntries[]
  /** Array of current pass (used by {@link GPURenderPassEncoder} at the moment, but can be extended to {@link GPUComputePassEncoder} as well) already set {@link core/bindGroups/BindGroup.BindGroup | bind groups}. */
  activeBindGroups: BindGroup[]

  constructor() {
    this.type = 'PipelineManager'

    this.currentPipelineIndex = null
    this.pipelineEntries = []
    this.activeBindGroups = []
  }

  /**
   * Compare two {@link ShaderOptions | shader objects}
   * @param shaderA - first {@link ShaderOptions | shader object} to compare
   * @param shaderB - second {@link ShaderOptions | shader object} to compare
   * @returns - whether the two {@link ShaderOptions | shader objects} code and entryPoint match
   */
  compareShaders(shaderA: ShaderOptions, shaderB: ShaderOptions): boolean {
    // store shader code in a Set map?
    // https://www.measurethat.net/Benchmarks/Show/30363/0/shaders-strings-comparisons
    return shaderA.code === shaderB.code && shaderA.entryPoint === shaderB.entryPoint
    //return shaderA.code?.localeCompare(shaderB.code) === 0 && shaderA.entryPoint === shaderB.entryPoint
  }

  /**
   * Checks if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters: RenderPipelineEntryParams): RenderPipelineEntry | null {
    return this.pipelineEntries
      .filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry)
      .find((pipelineEntry: RenderPipelineEntry) => {
        const { options } = pipelineEntry
        const { shaders, rendering, cacheKey } = parameters

        const sameCacheKey = cacheKey === options.cacheKey

        const sameVertexShader = this.compareShaders(shaders.vertex, options.shaders.vertex)
        const sameFragmentShader =
          (!shaders.fragment && !options.shaders.fragment) ||
          this.compareShaders(shaders.fragment as ShaderOptions, options.shaders.fragment as ShaderOptions)

        const differentParams = compareRenderingOptions(rendering, options.rendering)

        return sameCacheKey && !differentParams.length && sameVertexShader && sameFragmentShader
      }) as RenderPipelineEntry | null
  }

  /**
   * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param material - {@link RenderMaterial} used to create the pipeline.
   * @returns - {@link RenderPipelineEntry}, either from cache or newly created.
   */
  createRenderPipeline(material: RenderMaterial): RenderPipelineEntry {
    const { renderer, attributes, bindGroups, cacheKey, options } = material
    const { shaders, label, useAsyncPipeline, rendering } = options

    const parameters = {
      renderer,
      label: label + ' render pipeline',
      shaders,
      useAsync: useAsyncPipeline,
      bindGroups,
      cacheKey,
      rendering,
      attributes,
    }

    // render pipeline cache is based on 3 things:
    // 1. geometry and bind groups buffers layout comparison, via the cacheKey
    // 2. same rendering options via compareRenderingOptions()
    // 3. same vertex and fragment shaders code and entry points
    // see https://toji.dev/webgpu-gltf-case-study/#part-3-pipeline-caching
    const existingPipelineEntry = this.isSameRenderPipeline(parameters)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new RenderPipelineEntry(parameters)

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  /**
   * Checks if the provided {@link PipelineEntryParams | PipelineEntry parameters} belongs to an already created {@link ComputePipelineEntry}.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - the found {@link ComputePipelineEntry}, or null if not found
   */
  isSameComputePipeline(parameters: PipelineEntryParams): ComputePipelineEntry | null {
    return this.pipelineEntries
      .filter((pipelineEntry) => pipelineEntry instanceof ComputePipelineEntry)
      .find((pipelineEntry: ComputePipelineEntry) => {
        const { options } = pipelineEntry
        const { shaders, cacheKey } = parameters

        const sameCacheKey = cacheKey === options.cacheKey

        const sameComputeShader = this.compareShaders(shaders.compute, options.shaders.compute)

        return sameCacheKey && sameComputeShader
      }) as ComputePipelineEntry | null
  }

  /**
   * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param material - {@link ComputeMaterial} used to create the pipeline.
   * @returns - newly created {@link ComputePipelineEntry}
   */
  createComputePipeline(material: ComputeMaterial): ComputePipelineEntry {
    const { renderer, bindGroups, cacheKey, options } = material
    const { shaders, label, useAsyncPipeline } = options

    const parameters = {
      renderer,
      label: label + ' compute pipeline',
      shaders,
      useAsync: useAsyncPipeline,
      bindGroups,
      cacheKey,
    }

    const existingPipelineEntry = this.isSameComputePipeline(parameters)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new ComputePipelineEntry(parameters)

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  /**
   * Check if the given {@link AllowedPipelineEntries | PipelineEntry} is already set, if not set it
   * @param pass - current pass encoder
   * @param pipelineEntry - the {@link AllowedPipelineEntries | PipelineEntry} to set
   */
  setCurrentPipeline(pass: GPUPassTypes, pipelineEntry: AllowedPipelineEntries) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline as GPURenderPipeline & GPUComputePipeline)
      this.currentPipelineIndex = pipelineEntry.index
    }
  }

  /**
   * Track the active/already set {@link core/bindGroups/BindGroup.BindGroup | bind groups} to avoid `setBindGroup()` redundant calls.
   * @param pass - current pass encoder.
   * @param bindGroups - array {@link core/bindGroups/BindGroup.BindGroup | bind groups} passed by the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
   */
  setActiveBindGroups(pass: GPUPassTypes, bindGroups: BindGroup[]) {
    bindGroups.forEach((bindGroup, index) => {
      if (
        !this.activeBindGroups[index] ||
        this.activeBindGroups[index].uuid !== bindGroup.uuid ||
        this.activeBindGroups[index].index !== bindGroup.index // the same bind group might be used at different indices
      ) {
        this.activeBindGroups[index] = bindGroup
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
      }
    })
  }

  /**
   * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} and {@link activeBindGroups} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
   */
  resetCurrentPipeline() {
    this.currentPipelineIndex = null
    this.activeBindGroups = []
  }
}
