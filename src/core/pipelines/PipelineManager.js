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

    this.currentPipelineID = null
    this.pipelineEntries = []
  }

  isSamePipeline(parameters) {
    const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, geometryAttributes } = parameters

    return this.pipelineEntries.find((pipelineEntry) => {
      const { options } = pipelineEntry

      return (
        shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 &&
        shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 &&
        cullMode === options.cullMode &&
        depthWriteEnabled === options.depthWriteEnabled &&
        depthCompare === options.depthCompare &&
        transparent === options.transparent &&
        geometryAttributes.verticesOrder === options.verticesOrder
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
    if (pipelineEntry.id !== this.currentPipelineID) {
      pass.setPipeline(pipelineEntry.pipeline)

      // we changed our pipeline, reset the camera bind group
      // TODO only if pipelineEntry has a camera
      if (this.renderer.cameraBindGroup) {
        pass.setBindGroup(this.renderer.cameraBindGroup.index, this.renderer.cameraBindGroup.bindGroup)
      }

      this.currentPipelineID = pipelineEntry.id
    }
  }
}
