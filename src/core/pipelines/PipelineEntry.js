import { ProjectedShaderChunks, ShaderChunks } from '../shaders/ShaderChunks'
import { isRenderer } from '../../utils/renderer-utils'

let pipelineId = 0

export class PipelineEntry {
  constructor(parameters) {
    this.type = 'PipelineEntry'

    let { renderer } = parameters
    const { label, shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, useProjection } =
      parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, label ? label + ' ' + this.type : this.type)

    this.renderer = renderer

    Object.defineProperty(this, 'index', { value: pipelineId++ })

    this.layout = null
    this.pipeline = null
    this.ready = false

    this.shaders = {
      vertex: {
        head: '',
        code: '',
        module: null,
      },
      fragment: {
        head: '',
        code: '',
        module: null,
      },
      full: {
        code: '',
        module: null, // TODO useless?
      },
    }

    this.options = {
      label,
      shaders,
      cullMode,
      depthWriteEnabled,
      depthCompare,
      transparent,
      verticesOrder,
      useProjection,
    }
  }

  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups =
      this.renderer.cameraBindGroup && this.options.useProjection
        ? [this.renderer.cameraBindGroup, ...bindGroups]
        : bindGroups
  }

  setPipelineEntryBuffers(parameters) {
    const { geometryAttributes, bindGroups } = parameters

    this.geometryAttributes = geometryAttributes

    this.setPipelineEntryBindGroups(bindGroups)

    this.setPipelineEntry()
  }

  /** SHADERS **/

  patchShaders() {
    this.shaders.vertex.head = ''
    this.shaders.vertex.code = ''
    this.shaders.fragment.head = ''
    this.shaders.fragment.code = ''

    // first add chunks
    for (const chunk in ShaderChunks.vertex) {
      this.shaders.vertex.head = `\n${ShaderChunks.vertex[chunk]}${this.shaders.vertex.head}`
    }

    for (const chunk in ShaderChunks.fragment) {
      this.shaders.fragment.head = `\n${ShaderChunks.fragment[chunk]}${this.shaders.fragment.head}`
    }

    if (this.options.useProjection) {
      for (const chunk in ProjectedShaderChunks.vertex) {
        this.shaders.vertex.head = `\n${ProjectedShaderChunks.vertex[chunk]}${this.shaders.vertex.head}`
      }

      for (const chunk in ProjectedShaderChunks.fragment) {
        this.shaders.fragment.head = `\n${ProjectedShaderChunks.fragment[chunk]}${this.shaders.fragment.head}`
      }
    }

    this.bindGroups.toReversed().forEach((bindGroup) => {
      bindGroup.bindings.toReversed().forEach((binding) => {
        if (
          binding.visibility === GPUShaderStage.VERTEX ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.vertex.head = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.vertex.head}`

          if (binding.wgslStructFragment) {
            this.shaders.vertex.head = `\n${binding.wgslStructFragment}\n${this.shaders.vertex.head}`
          }
        }

        if (
          binding.visibility === GPUShaderStage.FRAGMENT ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.fragment.head = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.fragment.head}`

          if (binding.wgslStructFragment) {
            this.shaders.fragment.head = `${binding.wgslStructFragment}\n${this.shaders.fragment.head}`
          }
        }
      })
    })

    // add attributes to vertex shader only
    this.shaders.vertex.head = `${this.geometryAttributes.wgslStructFragment}\n${this.shaders.vertex.head}`

    this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code
    this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code

    this.shaders.full.code = this.shaders.vertex.code + '\n' + this.shaders.fragment.code
  }

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
    this.patchShaders()

    this.shaders.vertex.module = this.createShaderModule({
      code: this.shaders.vertex.code,
      type: 'Vertex',
    })

    this.shaders.fragment.module = this.createShaderModule({
      code: this.shaders.fragment.code,
      type: 'Fragment',
    })
  }

  createPipelineLayout() {
    this.layout = this.renderer.createPipelineLayout({
      label: this.options.label + ' layout',
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })
  }

  createRenderPipeline() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    this.pipeline = this.renderer.createRenderPipeline({
      label: this.options.label,
      layout: this.layout,
      vertex: {
        module: this.shaders.vertex.module,
        entryPoint: this.options.shaders.vertex.entryPoint,
        buffers: this.geometryAttributes.pipelineBuffers,
      },
      fragment: {
        module: this.shaders.fragment.module,
        entryPoint: this.options.shaders.fragment.entryPoint,
        targets: [
          {
            format: this.renderer.preferredFormat,
            // we will assume our renderer alphaMode is set to 'premultiplied'
            // based on how curtainsjs did that, we either disable blending if mesh if opaque
            // or use this blend equation if mesh is transparent (see https://github.com/martinlaxenaire/curtainsjs/blob/master/src/core/Renderer.js#L589)
            ...(this.options.transparent && {
              blend: {
                color: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                },
                alpha: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                },
                // color: {
                //   srcFactor: 'src-alpha',
                //   dstFactor: 'one-minus-src-alpha',
                // },
                // alpha: {
                //   srcFactor: 'one',
                //   dstFactor: 'one',
                // },
              },
            }),
          },
        ],
      },
      primitive: {
        //topology: 'triangle-list', // default setting anyway
        frontFace: this.options.verticesOrder,
        cullMode: this.options.cullMode,
      },
      depthStencil: {
        depthWriteEnabled: this.options.depthWriteEnabled,
        depthCompare: this.options.depthCompare,
        format: 'depth24plus',
      },
      ...(this.renderer.sampleCount > 1 && {
        multisample: {
          count: this.renderer.sampleCount,
        },
      }),
    })
  }

  flushPipelineEntry(newBindGroups = []) {
    this.ready = false
    this.setPipelineEntryBindGroups(newBindGroups)
    this.setPipelineEntry()
  }

  setPipelineEntry() {
    this.createShaders()
    this.createPipelineLayout()
    this.createRenderPipeline()
    this.ready = true
  }
}
