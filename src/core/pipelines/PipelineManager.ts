import { RenderPipelineEntry } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import {
  PipelineEntryBaseParams,
  PipelineEntryParams,
  RenderPipelineEntryBaseParams,
  RenderPipelineEntryParams,
} from '../../types/PipelineEntries'

/** Defines all types of allowed {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} class objects */
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

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

  constructor() {
    this.type = 'PipelineManager'

    this.currentPipelineIndex = null
    this.pipelineEntries = []
  }

  /**
   * Checks if the provided {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null {
    const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, topology } = parameters

    return this.pipelineEntries
      .filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry)
      .find((pipelineEntry: RenderPipelineEntry) => {
        const { options } = pipelineEntry

        return (
          shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 &&
          shaders.vertex.entryPoint === options.shaders.vertex.entryPoint &&
          shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 &&
          shaders.fragment.entryPoint === options.shaders.fragment.entryPoint &&
          cullMode === options.cullMode &&
          depthWriteEnabled === options.depthWriteEnabled &&
          depthCompare === options.depthCompare &&
          transparent === options.transparent &&
          verticesOrder === options.verticesOrder &&
          topology === options.topology
        )
      }) as RenderPipelineEntry | null
  }

  /**
   * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
   * @returns - {@link RenderPipelineEntry}, either from cache or newly created
   */
  createRenderPipeline(parameters: RenderPipelineEntryParams): RenderPipelineEntry {
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
   * Checks if the provided {@link PipelineEntryParams | parameters} belongs to an already created {@link ComputePipelineEntry}.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - the found {@link ComputePipelineEntry}, or null if not found
   */
  isSameComputePipeline(parameters: PipelineEntryParams) {
    const { shaders } = parameters

    return this.pipelineEntries
      .filter((pipelineEntry) => pipelineEntry instanceof ComputePipelineEntry)
      .find((pipelineEntry: ComputePipelineEntry) => {
        const { options } = pipelineEntry

        return (
          shaders.compute.code.localeCompare(options.shaders.compute.code) === 0 &&
          shaders.compute.entryPoint === options.shaders.compute.entryPoint
        )
      }) as ComputePipelineEntry | null
  }

  /**
   * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
   * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
   * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
   * @returns - newly created {@link ComputePipelineEntry}
   */
  createComputePipeline(parameters: PipelineEntryParams): ComputePipelineEntry {
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
  setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline as GPURenderPipeline & GPUComputePipeline)
      this.currentPipelineIndex = pipelineEntry.index
    }
  }

  /**
   * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
   */
  resetCurrentPipeline() {
    this.currentPipelineIndex = null
  }
}
