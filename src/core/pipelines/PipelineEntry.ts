import { isRenderer, Renderer } from '../../utils/renderer-utils'
import {
  PipelineEntryOptions,
  PipelineEntryParams,
  PipelineEntryStatus,
} from '../../types/core/pipelines/PipelineEntry'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { AllowedBindGroups } from '../../types/core/bindGroups/BindGroup'
import { MaterialShadersType } from '../../types/core/materials/Material'

let pipelineId = 0

export class PipelineEntry {
  type: string
  renderer: Renderer
  readonly index: number
  layout: GPUPipelineLayout | null
  pipeline: GPURenderPipeline | GPUComputePipeline | null
  status: PipelineEntryStatus
  options: PipelineEntryOptions

  bindGroups: AllowedBindGroups[]

  constructor(parameters: PipelineEntryParams) {
    this.type = 'PipelineEntry'

    let { renderer } = parameters
    const { label, shaders, useAsync } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, label ? label + ' ' + this.type : this.type)

    this.renderer = renderer

    Object.defineProperty(this as PipelineEntry, 'index', { value: pipelineId++ })

    this.layout = null
    this.pipeline = null

    this.status = {
      compiling: false,
      compiled: false,
      error: null,
    }

    //this.ready = false

    this.options = {
      label,
      shaders,
      useAsync: useAsync !== undefined ? useAsync : true,
    }
  }

  get ready(): boolean {
    return !this.status.compiling && this.status.compiled && !this.status.error
  }

  get canCompile(): boolean {
    return !this.status.compiling && !this.status.compiled && !this.status.error
  }

  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups = bindGroups
  }

  /** SHADERS **/

  createShaderModule({ code = '', type = 'vertex' }: { code: string; type: MaterialShadersType }): GPUShaderModule {
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

  flushPipelineEntry(newBindGroups: AllowedBindGroups[] = []) {
    this.status.compiling = false
    this.status.compiled = false
    this.status.error = null

    this.setPipelineEntryBindGroups(newBindGroups)
    this.setPipelineEntry()
  }

  setPipelineEntry() {
    this.status.compiling = true

    this.createShaders()
    this.createPipelineLayout()
    this.createPipelineDescriptor()
  }
}
