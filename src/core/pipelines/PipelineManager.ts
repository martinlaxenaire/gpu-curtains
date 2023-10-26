import { RenderPipelineEntry } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderPipelineEntryBaseParams } from '../../types/core/pipelines/RenderPipelineEntry'
import { PipelineEntryBaseParams } from '../../types/core/pipelines/PipelineEntry'

export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

export class PipelineManager {
  type: string
  renderer: Renderer
  currentPipelineIndex: number | null
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

  isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null {
    const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder } = parameters

    return this.pipelineEntries
      .filter((pipelineEntry) => pipelineEntry.type === 'RenderPipelineEntry')
      .find((pipelineEntry) => {
        const { options } = pipelineEntry

        return (
          shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 &&
          shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 &&
          cullMode === options.cullMode &&
          depthWriteEnabled === options.depthWriteEnabled &&
          depthCompare === options.depthCompare &&
          transparent === options.transparent &&
          verticesOrder === options.verticesOrder
        )
      }) as RenderPipelineEntry | null
  }

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

  createComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry {
    const pipelineEntry = new ComputePipelineEntry({
      renderer: this.renderer,
      ...parameters,
    })

    this.pipelineEntries.push(pipelineEntry)

    return pipelineEntry
  }

  setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline as GPURenderPipeline & GPUComputePipeline)
      this.currentPipelineIndex = pipelineEntry.index
    }
  }

  resetCurrentPipeline() {
    this.currentPipelineIndex = null
  }
}
