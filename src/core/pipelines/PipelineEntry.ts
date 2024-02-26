import { isRenderer, Renderer } from '../renderers/utils'
import { PipelineEntryOptions, PipelineEntryParams, PipelineEntryStatus } from '../../types/PipelineEntries'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { AllowedBindGroups } from '../../types/BindGroups'
import { MaterialShadersType } from '../../types/Materials'

let pipelineId = 0

/**
 * Used as a base class to create a pipeline entry.<br>
 * {@link PipelineEntry} roles are:
 * - Patch the given {@link core/materials/Material.Material | Material} shaders code and create the corresponding {@link GPUShaderModule}.
 * - Create a {@link GPUPipelineLayout | pipeline layout} with the given {@link core/materials/Material.Material#bindGroups | bind groups}
 * - Create a GPU pipeline
 */
export class PipelineEntry {
  /** The type of the {@link PipelineEntry} */
  type: string
  /** The {@link Renderer} used to create this {@link PipelineEntry} */
  renderer: Renderer
  /** Index of this {@link PipelineEntry}, i.e. creation order */
  readonly index: number
  /** {@link GPUPipelineLayout | Pipeline layout} created based on the given {@link bindGroups | bind groups} */
  layout: GPUPipelineLayout | null
  /** The GPU pipeline */
  pipeline: GPURenderPipeline | GPUComputePipeline | null
  /** The pipeline {@link PipelineEntryStatus | compilation status} */
  status: PipelineEntryStatus
  /** Options used to create this {@link PipelineEntry} */
  options: PipelineEntryOptions

  /** {@link core/materials/Material.Material#bindGroups | bind groups} used to patch the shaders and create the {@link PipelineEntry#layout | pipeline layout} */
  bindGroups: AllowedBindGroups[]

  /**
   * PipelineEntry constructor
   * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link PipelineEntry}
   */
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

    this.options = {
      label,
      shaders,
      useAsync: useAsync !== undefined ? useAsync : true,
    }
  }

  /**
   * Get whether the {@link pipeline} is ready, i.e. successfully compiled
   * @readonly
   */
  get ready(): boolean {
    return !this.status.compiling && this.status.compiled && !this.status.error
  }

  /**
   * Get whether the {@link pipeline} is ready to be compiled, i.e. we have not already tried to compile it, and it's not currently compiling neither
   * @readonly
   */
  get canCompile(): boolean {
    return !this.status.compiling && !this.status.compiled && !this.status.error
  }

  /**
   * Set our {@link PipelineEntry#bindGroups | pipeline entry bind groups}
   * @param bindGroups - {@link core/materials/Material.Material#bindGroups | bind groups} to use with this {@link PipelineEntry}
   */
  setPipelineEntryBindGroups(bindGroups: AllowedBindGroups[]) {
    this.bindGroups = bindGroups
  }

  /* SHADERS */

  /**
   * Create a {@link GPUShaderModule}
   * @param parameters - Parameters used
   * @param parameters.code - patched WGSL code string
   * @param parameters.type - {@link MaterialShadersType | shader type}
   * @returns - compiled {@link GPUShaderModule} if successful
   */
  createShaderModule({ code = '', type = 'vertex' }: { code: string; type: MaterialShadersType }): GPUShaderModule {
    const shaderModule = this.renderer.createShaderModule({
      label: this.options.label + ': ' + type + ' shader module',
      code,
    })

    if ('getCompilationInfo' in shaderModule && !this.renderer.production) {
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
              // TODO mesh onError?
              console.error(`${this.options.label} compilation error:\n${formattedMessage}`)
              break
            case 'warning':
              console.warn(`${this.options.label} compilation warning:\n${formattedMessage}`)
              break
            case 'info':
              console.log(`${this.options.label} compilation information:\n${formattedMessage}`)
              break
          }
        }
      })
    }

    return shaderModule
  }

  /* SETUP */

  /**
   * Create the {@link PipelineEntry} shaders
   */
  createShaders() {
    /* will be overriden */
  }

  /**
   * Create the pipeline entry {@link layout}
   */
  createPipelineLayout() {
    this.layout = this.renderer.createPipelineLayout({
      label: this.options.label + ' layout',
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })
  }

  /**
   * Create the {@link PipelineEntry} descriptor
   */
  createPipelineDescriptor() {
    /* will be overriden */
  }

  /**
   * Flush a {@link PipelineEntry}, i.e. reset its {@link bindGroups | bind groups}, {@link layout} and descriptor and recompile the {@link pipeline}
   * Used when one of the bind group or rendering property has changed
   * @param newBindGroups - new {@link bindGroups | bind groups} in case they have changed
   */
  flushPipelineEntry(newBindGroups: AllowedBindGroups[] = []) {
    this.status.compiling = false
    this.status.compiled = false
    this.status.error = null

    this.setPipelineEntryBindGroups(newBindGroups)
    this.compilePipelineEntry()
  }

  /**
   * Set up a {@link pipeline} by creating the shaders, the {@link layout} and the descriptor
   */
  compilePipelineEntry() {
    this.status.compiling = true

    this.createShaders()
    this.createPipelineLayout()
    this.createPipelineDescriptor()
  }
}
