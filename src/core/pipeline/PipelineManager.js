import { PipelineEntry } from './PipelineEntry'
import { isRenderer } from '../../utils/renderer-utils'

export class PipelineManager {
  constructor({ renderer }) {
    this.type = 'PipelineManager'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('PipelineManager fail')
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

      // we changed our pipeline, reset the camera bind group
      if (this.renderer.cameraBindGroup) {
        pass.setBindGroup(this.renderer.cameraBindGroup.index, this.renderer.cameraBindGroup.bindGroup)
      }

      this.currentPipelineId = pipelineEntry.id
    }
  }
}
