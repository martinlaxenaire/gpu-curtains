import { PipelineEntry } from './PipelineEntry'
import { isRenderer } from '../../utils/renderer-utils'

export class PipelineManager {
  constructor({ renderer }) {
    this.type = 'PipelineManager'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

    this.renderer = renderer

    this.currentPipelineIndex = null
    this.pipelineEntries = []
  }

  isSamePipeline(parameters) {
    const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder } = parameters

    return this.pipelineEntries.find((pipelineEntry) => {
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
    })
  }

  createRenderPipeline(parameters) {
    const existingPipelineEntry = this.isSamePipeline(parameters)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new PipelineEntry({
        renderer: this.renderer,
        ...parameters,
      })

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  setCurrentPipeline(pass, pipelineEntry) {
    if (pipelineEntry.index !== this.currentPipelineIndex) {
      pass.setPipeline(pipelineEntry.pipeline)
      this.currentPipelineIndex = pipelineEntry.index
    }
  }

  resetCurrentPipeline() {
    this.currentPipelineIndex = null
  }
}
