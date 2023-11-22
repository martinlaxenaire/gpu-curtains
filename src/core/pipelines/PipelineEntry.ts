import { isRenderer, Renderer } from '../renderers/utils'
import { PipelineEntryOptions, PipelineEntryParams, PipelineEntryStatus } from '../../types/PipelineEntries'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { AllowedBindGroups } from '../../types/BindGroups'
import { MaterialShadersType } from '../../types/Materials'

let pipelineId = 0

/**
 * PipelineEntry class:
 * Used as a base class to create a pipeline entry.
 * PipelineEntry roles are:
 * - Patch the given {@link Material} shaders code and create the corresponding {@link GPUShaderModule}.
 * - Create a [Pipeline layout]{@link GPUPipelineLayout} with the given [bind groups]{@link Material#bindGroups}
 * - Create a GPU pipeline
 */
export class PipelineEntry {
  /** The type of the {@link PipelineEntry} */
  type: string
  /** The [renderer]{@link Renderer} used to create this {@link PipelineEntry} */
  renderer: Renderer
  /** Index of this {@link PipelineEntry}, i.e. creation order */
  readonly index: number
  /** [Pipeline layout]{@link GPUPipelineLayout} created based on the given [bind groups]{@link PipelineEntry#bindGroups} */
  layout: GPUPipelineLayout | null
  /** The GPU pipeline */
  pipeline: GPURenderPipeline | GPUComputePipeline | null
  /** The pipeline [compilation status]{@link PipelineEntryStatus} */
  status: PipelineEntryStatus
  /** Options used to create this {@link PipelineEntry} */
  options: PipelineEntryOptions

  /** [bind groups]{@link Material#bindGroups} used to patch the shaders and create the [pipeline layout]{@link PipelineEntry#layout} */
  bindGroups: AllowedBindGroups[]

  /**
   * PipelineEntry constructor
   * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link PipelineEntry}
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

    //this.ready = false

    this.options = {
      label,
      shaders,
      useAsync: useAsync !== undefined ? useAsync : true,
    }
  }

  /**
   * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready, i.e. successfully compiled
   * @readonly
   */
  get ready(): boolean {
    return !this.status.compiling && this.status.compiled && !this.status.error
  }

  /**
   * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready to be compiled, i.e. we have already not already tried to compile it, and it's not currently compiling neither
   * @readonly
   */
  get canCompile(): boolean {
    return !this.status.compiling && !this.status.compiled && !this.status.error
  }

  /**
   * Set our [pipeline entry bind groups]{@link PipelineEntry#bindGroups}
   * @param bindGroups - [bind groups]{@link Material#bindGroups} to use with this {@link PipelineEntry}
   */
  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups = bindGroups
  }

  /* SHADERS */

  /**
   * Create a {@link GPUShaderModule}
   * @param parameters - Parameters used
   * @param parameters.code - patched WGSL code string
   * @param parameters.type - [shader type]{@link MaterialShadersType}
   * @returns - compiled {@link GPUShaderModule} if successful
   */
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

  /* SETUP */

  /**
   * Create the {@link PipelineEntry} shaders
   */
  createShaders() {
    /* will be overriden */
  }

  /**
   * Create the [pipeline entry layout]{@link PipelineEntry#layout}
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
   * Flush a {@link PipelineEntry}, i.e. reset its [bind groups]{@link PipelineEntry#bindGroups}, [layout]{@link PipelineEntry#layout} and descriptor and recompile the [pipeline]{@link PipelineEntry#pipeline}
   * Used when one of the bind group or rendering property has changed
   * @param newBindGroups - new [bind groups]{@link PipelineEntry#bindGroups} in case they have changed
   */
  flushPipelineEntry(newBindGroups: AllowedBindGroups[] = []) {
    this.status.compiling = false
    this.status.compiled = false
    this.status.error = null

    this.setPipelineEntryBindGroups(newBindGroups)
    this.setPipelineEntry()
  }

  /**
   * Set up a [pipeline]{@link PipelineEntry#pipeline} by creating the shaders, the [layout]{@link PipelineEntry#layout} and the descriptor
   */
  setPipelineEntry() {
    this.status.compiling = true

    this.createShaders()
    this.createPipelineLayout()
    this.createPipelineDescriptor()
  }
}
