import { ProjectedShaderChunks, ShaderChunks } from '../shaders/ShaderChunks'
import { isRenderer } from '../../utils/renderer-utils'
import { PipelineEntry } from './PipelineEntry'
import { throwError } from '../../utils/utils'

export class RenderPipelineEntry extends PipelineEntry {
  constructor(parameters) {
    let { renderer } = parameters
    const { label, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, useProjection } = parameters

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

    this.descriptor = null

    this.options = {
      ...this.options,
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
    const { attributes, bindGroups } = parameters

    this.attributes = attributes

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
      this.shaders.vertex.head = `${ShaderChunks.vertex[chunk]}\n${this.shaders.vertex.head}`
    }

    for (const chunk in ShaderChunks.fragment) {
      this.shaders.fragment.head = `${ShaderChunks.fragment[chunk]}\n${this.shaders.fragment.head}`
    }

    if (this.options.useProjection) {
      for (const chunk in ProjectedShaderChunks.vertex) {
        this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}\n${this.shaders.vertex.head}`
      }

      for (const chunk in ProjectedShaderChunks.fragment) {
        this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}\n${this.shaders.fragment.head}`
      }
    }

    const groupsBindings = []
    this.bindGroups.forEach((bindGroup) => {
      let bindIndex = 0
      bindGroup.bindings.forEach((binding, bindingIndex) => {
        binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
          groupsBindings.push({
            groupIndex: bindGroup.index,
            visibility: binding.visibility,
            bindIndex,
            wgslStructFragment: binding.wgslStructFragment,
            wgslGroupFragment: groupFragment,
            newLine:
              bindingIndex === bindGroup.bindings.length - 1 &&
              groupFragmentIndex === binding.wgslGroupFragment.length - 1,
          })

          bindIndex++
        })
      })
    })

    groupsBindings.forEach((groupBinding) => {
      if (
        groupBinding.visibility === GPUShaderStage.VERTEX ||
        groupBinding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)
      ) {
        if (groupBinding.wgslStructFragment) {
          this.shaders.vertex.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.vertex.head}`
        }

        this.shaders.vertex.head = `${this.shaders.vertex.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

        if (groupBinding.newLine) this.shaders.vertex.head += `\n`
      }

      if (
        groupBinding.visibility === GPUShaderStage.FRAGMENT ||
        groupBinding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)
      ) {
        if (groupBinding.wgslStructFragment) {
          this.shaders.fragment.head = `\n${groupBinding.wgslStructFragment}\n${this.shaders.fragment.head}`
        }

        this.shaders.fragment.head = `${this.shaders.fragment.head}\n@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`

        if (groupBinding.newLine) this.shaders.fragment.head += `\n`
      }
    })

    // add attributes to vertex shader only
    this.shaders.vertex.head = `${this.attributes.wgslStructFragment}\n${this.shaders.vertex.head}`

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

  createPipelineDescriptor() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    let vertexLocationIndex = -1

    this.descriptor = {
      label: this.options.label,
      layout: this.layout,
      vertex: {
        module: this.shaders.vertex.module,
        entryPoint: this.options.shaders.vertex.entryPoint,
        buffers: this.attributes.vertexBuffers.map((vertexBuffer) => {
          return {
            stepMode: vertexBuffer.stepMode,
            arrayStride: vertexBuffer.arrayStride * 4, // 4 bytes each
            attributes: vertexBuffer.attributes.map((attribute) => {
              vertexLocationIndex++
              return {
                shaderLocation: vertexLocationIndex,
                offset: attribute.bufferOffset, // previous attribute size * 4
                format: attribute.bufferFormat,
              }
            }),
          }
        }),
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
    }
  }

  createRenderPipeline() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    try {
      this.pipeline = this.renderer.createRenderPipeline(this.descriptor)
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  async createRenderPipelineAsync() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    try {
      this.pipeline = await this.renderer.createRenderPipelineAsync(this.descriptor)
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  setPipelineEntry() {
    super.setPipelineEntry()

    if (this.options.useAsync) {
      this.createRenderPipelineAsync()
    } else {
      this.createRenderPipeline()
      this.status.compiled = true
      this.status.compiling = false
      this.status.error = null
    }
  }
}
