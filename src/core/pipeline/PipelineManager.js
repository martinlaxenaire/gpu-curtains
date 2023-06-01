import { PipelineEntry } from './PipelineEntry'

export class PipelineManager {
  constructor({ renderer }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || !(renderer.type === 'Renderer' || renderer.type === 'CurtainsRenderer')) {
      return
    }

    this.renderer = renderer

    this.currentPipelineId = null
    this.pipelineEntries = []
  }

  isSamePipeline(shaders) {
    return this.pipelineEntries.find((pipelineEntry) => {
      const existingShaders = pipelineEntry.options.shaders
      return (
        shaders.vertex.code.localeCompare(existingShaders.vertex.code) === 0 &&
        shaders.fragment.code.localeCompare(existingShaders.fragment.code) === 0
      )
    })
  }

  createRenderPipeline({ label = 'Render Pipeline', attributes = {}, bindGroups = [], shaders = {} }) {
    const existingPipelineEntry = this.isSamePipeline(shaders)

    if (existingPipelineEntry) {
      return existingPipelineEntry
    } else {
      const pipelineEntry = new PipelineEntry({
        renderer: this.renderer,
        label,
        attributes,
        bindGroups,
        shaders,
      })

      this.pipelineEntries.push(pipelineEntry)

      return pipelineEntry
    }
  }

  setCurrentPipeline(pass, pipelineEntry) {
    if (pipelineEntry.id !== this.currentPipelineId) {
      pass.setPipeline(pipelineEntry.pipeline)
      this.currentPipelineId = pipelineEntry.id
    }
  }
}
