import { ShaderChunks } from '../shaders/ShaderChunks'
import { isRenderer } from '../../utils/renderer-utils'

let pipelineId = 0

export class PipelineEntry {
  constructor(parameters) {
    this.type = 'PipelineEntry'

    let { renderer } = parameters
    // const { label, geometryAttributes, bindGroups, shaders, cullMode, depthWriteEnabled, depthCompare, transparent } =
    //   parameters

    const { label, shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('PipelineEntry fail')
      return
    }

    this.renderer = renderer

    Object.defineProperty(this, 'index', { value: pipelineId++ })

    this.layout = null
    this.pipeline = null

    this.shaders = {
      vertex: {
        code: '',
        module: null,
      },
      fragment: {
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
    }
  }

  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups = this.renderer.cameraBindGroup ? [this.renderer.cameraBindGroup, ...bindGroups] : bindGroups
  }

  setPipelineEntryBuffers(parameters) {
    const { geometryAttributes, bindGroups } = parameters

    this.geometryAttributes = geometryAttributes
    this.setPipelineEntryBindGroups(bindGroups)

    this.setPipelineEntry()
  }

  /** SHADERS **/

  patchShaders() {
    this.shaders.vertex.code = this.options.shaders.vertex.code
    this.shaders.fragment.code = this.options.shaders.fragment.code

    // first add chunks
    for (const chunk in ShaderChunks.vertex) {
      this.shaders.vertex.code = `\n${ShaderChunks.vertex[chunk]}\n ${this.shaders.vertex.code}`
    }

    for (const chunk in ShaderChunks.fragment) {
      this.shaders.fragment.code = `\n${ShaderChunks.fragment[chunk]}\n ${this.shaders.fragment.code}`
    }

    this.bindGroups.toReversed().forEach((bindGroup) => {
      bindGroup.bindings.toReversed().forEach((binding) => {
        if (
          binding.visibility === GPUShaderStage.VERTEX ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.vertex.code = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.vertex.code}\n`

          if (binding.wgslStructFragment) {
            this.shaders.vertex.code = `\n${binding.wgslStructFragment}\n ${this.shaders.vertex.code}`
          }
        }

        if (
          binding.visibility === GPUShaderStage.FRAGMENT ||
          binding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT)
        ) {
          this.shaders.fragment.code = `\n@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.fragment.code}\n`

          if (binding.wgslStructFragment) {
            this.shaders.fragment.code = `${binding.wgslStructFragment}\n ${this.shaders.fragment.code}`
          }
        }
      })

      this.shaders.vertex.code = `\n ${this.shaders.vertex.code}`
      this.shaders.fragment.code = `\n ${this.shaders.fragment.code}`
    })

    // add attributes to vertex shader only
    this.shaders.vertex.code = `${this.geometryAttributes.wgslStructFragment}\n ${this.shaders.vertex.code}`

    this.shaders.full.code = this.shaders.vertex.code + '\n' + this.shaders.fragment.code
  }

  createShaderModule({ code = '', type = '' }) {
    return this.renderer.device.createShaderModule({
      label: this.options.label + ': ' + type + 'Shader module',
      code,
    })
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
    this.layout = this.renderer.device.createPipelineLayout({
      bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })
  }

  createRenderPipeline() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    this.pipeline = this.renderer.device.createRenderPipeline({
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
      ...(this.renderer.renderPass.sampleCount > 1 && {
        multisample: {
          count: this.renderer.renderPass.sampleCount,
        },
      }),
    })
  }

  flushPipelineEntry(newBindGroups = []) {
    this.setPipelineEntryBindGroups(newBindGroups)
    this.setPipelineEntry()
  }

  setPipelineEntry() {
    this.createShaders()
    this.createPipelineLayout()
    this.createRenderPipeline()
  }
}
