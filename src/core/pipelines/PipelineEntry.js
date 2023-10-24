import { isRenderer } from '../../utils/renderer-utils'

let pipelineId = 0

export class PipelineEntry {
  constructor(parameters) {
    this.type = 'PipelineEntry'

    let { renderer } = parameters
    const { label, shaders, useAsync } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, label ? label + ' ' + this.type : this.type)

    this.renderer = renderer

    Object.defineProperty(this, 'index', { value: pipelineId++ })

    this.layout = null
    this.pipeline = null
    this.ready = false

    this.options = {
      label,
      shaders,
      useAsync: useAsync !== undefined ? useAsync : true,
    }
  }

  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups = bindGroups
  }

  /** SHADERS **/

  createShaderModule({ code = '', type = '' }) {
    const shaderModule = this.renderer.createShaderModule({
      label: this.options.label + ': ' + type + 'Shader module',
      code,
    })

    shaderModule.getCompilationInfo().then((compilationInfo) => {
      for (const message of compilationInfo.messages) {
        let formattedMessage = ''
        if (message.lineNum) {
          formattedMessage += `Line ${message.lineNum}:${message.linePos} - ${code.substring(
            message.offset,
            message.offset + message.length
          )}\n`
        }
        formattedMessage += message.message

        switch (message.type) {
          case 'error':
            // TODO mesh onError
            !this.renderer.production && console.error(`${this.options.label} compilation error:\n${formattedMessage}`)
            break
          case 'warning':
            !this.renderer.production && console.warn(`${this.options.label} compilation warning:\n${formattedMessage}`)
            break
          case 'info':
            !this.renderer.production &&
              console.log(`${this.options.label} compilation information:\n${formattedMessage}`)
            break
        }
      }
    })

    return shaderModule
  }

  /** SETUP **/

  createShaders() {
    /* will be overriden */
  }

  createPipelineLayout() {
    this.layout = this.renderer.createPipelineLayout({
      label: this.options.label + ' layout',
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })
  }

  createPipelineDescriptor() {
    /* will be overriden */
  }

  flushPipelineEntry(newBindGroups = []) {
    this.ready = false
    this.setPipelineEntryBindGroups(newBindGroups)
    this.setPipelineEntry()
  }

  setPipelineEntry() {
    this.createShaders()
    this.createPipelineLayout()
    this.createPipelineDescriptor()
  }
}
