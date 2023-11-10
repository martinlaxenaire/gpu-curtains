import { PipelineEntry } from './PipelineEntry'
import { ProjectedShaderChunks, ShaderChunks } from '../shaders/ShaderChunks'
import { CameraRenderer, isRenderer, Renderer } from '../../utils/renderer-utils'
import { throwError } from '../../utils/utils'
import {
  PipelineEntryParams,
  PipelineEntryShaders,
  RenderPipelineEntryPropertiesParams,
} from '../../types/PipelineEntries'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { BindGroupBufferBindingElement } from '../../types/BindGroups'
import { RenderMaterialAttributes } from '../../types/Materials'

/**
 * RenderPipelineEntry class:
 * Used to create a pipeline entry specifically designed to draw meshes.
 * @extends PipelineEntry
 */
export class RenderPipelineEntry extends PipelineEntry {
  /** Shaders to use with this {@link RenderPipelineEntry} */
  shaders: PipelineEntryShaders
  /** [Geometry attributes]{@link RenderMaterialAttributes} sent to the {@link RenderPipelineEntry} */
  attributes: RenderMaterialAttributes
  /** [Renderer pipeline descriptor]{@link GPURenderPipelineDescriptor} based on [layout]{@link RenderPipelineEntry#layout} and [shaders]{@link RenderPipelineEntry#shaders} */
  descriptor: GPURenderPipelineDescriptor | null

  /**
   * RenderPipelineEntry constructor
   * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link RenderPipelineEntry}
   */
  constructor(parameters: PipelineEntryParams) {
    let { renderer } = parameters
    const { label, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, useProjection } = parameters

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

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

  // TODO!
  // need to chose whether we should silently add the camera bind group here
  // or explicitly in the RenderMaterial class createBindGroups() method
  /**
   * Merge our [pipeline entry bind groups]{@link RenderPipelineEntry#bindGroups} with the [camera bind group]{@link CameraRenderer#cameraBindGroup} if needed and set them
   * @param bindGroups - [bind groups]{@link RenderMaterial#bindGroups} to use with this {@link RenderPipelineEntry}
   */
  setPipelineEntryBindGroups(bindGroups) {
    this.bindGroups =
      'cameraBindGroup' in this.renderer && this.options.useProjection
        ? [this.renderer.cameraBindGroup, ...bindGroups]
        : bindGroups
  }

  /**
   * Set {@link RenderPipelineEntry} properties (in this case the [bind groups]{@link RenderPipelineEntry#bindGroups} and [attributes]{@link RenderPipelineEntry#attributes}) and create the [pipeline]{@link RenderPipelineEntry#pipeline} itself
   * @param parameters - the [bind groups]{@link RenderMaterial#bindGroups} and [attributes]{@link RenderMaterial#attributes} to use
   */
  setPipelineEntryProperties(parameters: RenderPipelineEntryPropertiesParams) {
    const { attributes, bindGroups } = parameters

    this.attributes = attributes

    this.setPipelineEntryBindGroups(bindGroups)

    this.setPipelineEntry()
  }

  /* SHADERS */

  /**
   * Patch the shaders by appending all the necessary shader chunks, [bind groups]{@link RenderPipelineEntry#bindGroups}) and [attributes]{@link RenderPipelineEntry#attributes} WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
   */
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
            wgslStructFragment: (binding as BindGroupBufferBindingElement).wgslStructFragment,
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

  /* SETUP */

  /**
   * Create the [shaders]{@link RenderPipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
   */
  createShaders() {
    this.patchShaders()

    this.shaders.vertex.module = this.createShaderModule({
      code: this.shaders.vertex.code,
      type: 'vertex',
    })

    this.shaders.fragment.module = this.createShaderModule({
      code: this.shaders.fragment.code,
      type: 'fragment',
    })
  }

  /**
   * Create the [render pipeline descriptor]{@link RenderPipelineEntry#descriptor}
   */
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
    } as GPURenderPipelineDescriptor
  }

  /**
   * Create the [render pipeline]{@link RenderPipelineEntry#pipeline}
   */
  createRenderPipeline() {
    if (!this.shaders.vertex.module || !this.shaders.fragment.module) return

    try {
      this.pipeline = this.renderer.createRenderPipeline(this.descriptor)
    } catch (error) {
      this.status.error = error
      throwError(error)
    }
  }

  /**
   * Asynchronously create the [render pipeline]{@link RenderPipelineEntry#pipeline}
   * @async
   * @returns - void promise result
   */
  async createRenderPipelineAsync(): Promise<void> {
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

  /**
   * Call [super setPipelineEntry]{@link PipelineEntry#setPipelineEntry} method, then create our [render pipeline]{@link RenderPipelineEntry#pipeline}
   */
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
