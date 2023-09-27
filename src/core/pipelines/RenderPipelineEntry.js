import { ProjectedShaderChunks, ShaderChunks } from '../shaders/ShaderChunks'
import { isRenderer } from '../../utils/renderer-utils'
import { PipelineEntry } from './PipelineEntry'

export class RenderPipelineEntry extends PipelineEntry {
  constructor(parameters) {
    let { renderer } = parameters
    const { label, shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, useProjection } =
      parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    const type = 'RenderPipelineEntry'

    isRenderer(renderer, label ? label + ' ' + type : type)

    super(parameters)

    this.type = type

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
            // we either disable blending if mesh if opaque
            // or use this blend equation if mesh is transparent (see https://limnu.com/webgl-blending-youre-probably-wrong/)
            ...(this.options.transparent && {
              blend: {
                color: {
                  srcFactor: 'src-alpha',
                  dstFactor: 'one-minus-src-alpha',
                },
                alpha: {
                  srcFactor: 'one',
                  dstFactor: 'one-minus-src-alpha',
                },
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

  setPipelineEntry() {
    super.setPipelineEntry()
    this.createRenderPipeline()
    this.ready = true
  }
}
