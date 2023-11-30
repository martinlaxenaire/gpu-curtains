import { RenderPipelineEntry } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { PipelineEntryBaseParams, RenderPipelineEntryBaseParams } from '../../types/PipelineEntries'

/** Defines all types of allowed {@link PipelineEntry} class objects */
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

/**
 * PipelineManager class:
 * Used to create and keep track of both {@link ComputePipelineEntry} and {@link RenderPipelineEntry}.
 * Perform checks to eventually use a cached pipeline entry instead of creating a new one.
 * Also responsible for setting the current pass encoder pipeline in order to avoid redundant setPipeline calls
 */
export class PipelineManager {
  /** The type of the {@link PipelineManager} */
  type: string
  /** The [renderer]{@link Renderer} used to create this {@link PipelineManager} */
  renderer: Renderer
  /** Keep track of the current bound pipeline in order to avoid redundant setPipeline calls */
  currentPipelineIndex: number | null
  /** Array of already created {@link ComputePipelineEntry} and {@link RenderPipelineEntry} */
  pipelineEntries: AllowedPipelineEntries[]

  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    this.type = 'PipelineManager'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, this.type)

    this.renderer = renderer

    this.currentPipelineIndex = null
    this.pipelineEntries = []
  }

  /**
   * Checks if the provided [parameters]{@link RenderPipelineEntryBaseParams} belongs to an already created {@link RenderPipelineEntry}.
   * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
   * @returns - the found {@link RenderPipelineEntry}, or null if not found
   */
  isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null {
    const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder } = parameters

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
          verticesOrder === options.verticesOrder
        )
      }) as RenderPipelineEntry | null
  }

  /**
   * Check if a {@link RenderPipelineEntry} has already been created with the given [parameters]{@link RenderPipelineEntryBaseParams}.
   * Use it if found, else create a new one and add it to the [pipelineEntries]{@link PipelineManager#pipelineEntries} array.
   * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
   * @returns - {@link RenderPipelineEntry}, either from cache or newly created
   */
  createRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry {
    const existingPipelineEntry = this.isSameRenderPipeline(parameters)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new RenderPipelineEntry({
        renderer: this.renderer,
        ...parameters,
      })

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  /**
   * Checks if the provided [parameters]{@link PipelineEntryBaseParams} belongs to an already created {@link ComputePipelineEntry}.
   * @param parameters - [ComputePipelineEntry parameters]{@link PipelineEntryBaseParams}
   * @returns - the found {@link ComputePipelineEntry}, or null if not found
   */
  isSameComputePipeline(parameters: PipelineEntryBaseParams) {
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
   * Create a new {@link ComputePipelineEntry}
   * @param parameters - [PipelineEntry parameters]{@link PipelineEntryBaseParams}
   * @returns - newly created {@link ComputePipelineEntry}
   */
  createComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry {
    const existingPipelineEntry = this.isSameComputePipeline(parameters)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new ComputePipelineEntry({
        renderer: this.renderer,
        ...parameters,
      })

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  /**
   * Check if the given [pipeline entry]{@link AllowedPipelineEntries} is already set, if not set it
   * @param pass - current pass encoder
   * @param pipelineEntry - the [pipeline entry]{@link AllowedPipelineEntries} to set
   */
  setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline as GPURenderPipeline & GPUComputePipeline)
      this.currentPipelineIndex = pipelineEntry.index
    }
  }

  /**
   * Reset the [current pipeline index]{@link PipelineManager#currentPipelineIndex} so the next [pipeline entry]{@link AllowedPipelineEntries} will be set for sure
   */
  resetCurrentPipeline() {
    this.currentPipelineIndex = null
  }
}
