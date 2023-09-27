import { Material } from './Material'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class RenderMaterial extends Material {
  constructor(renderer, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    const type = 'RenderMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    let { shaders, label, uniformsBindings, geometry, ...renderingOptions } = parameters

    // shaders = {
    //   ...{
    //     vertex: {
    //       entryPoint: 'main',
    //     },
    //     fragment: {
    //       entryPoint: 'main',
    //     },
    //   },
    //   ...shaders,
    // }

    if (!shaders.vertex.entryPoint) {
      shaders.vertex.entryPoint = 'main'
    }

    if (!shaders.fragment.entryPoint) {
      shaders.fragment.entryPoint = 'main'
    }

    this.options = {
      shaders,
      label,
      uniformsBindings,
      rendering: { ...renderingOptions, verticesOrder: geometry.verticesOrder },
    }

    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      ...this.options.rendering,
    })

    this.attributes = {
      geometry: null,
      buffers: null,
    }

    this.setAttributesFromGeometry(geometry)
  }

  setMaterial() {
    if (!this.attributes.buffers) {
      this.createAttributesBuffers()
    }

    // camera + model bind groups
    const modelBindGroupLength = this.uniformsBindGroups.length
    const texturesBindGroupLength = 1
    const bindGroupsReady = this.bindGroups.length === modelBindGroupLength + texturesBindGroupLength

    // TODO cache bind groups and pipelines?
    // https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change
    if (!bindGroupsReady) {
      this.createBindGroups()
      return
    }

    if (this.pipelineEntry && !this.pipelineEntry.pipeline) {
      this.setPipelineEntryBuffers()
    }
  }

  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      geometryAttributes: this.attributes.geometry,
      bindGroups: this.bindGroups,
    })
  }

  get ready() {
    return !!(this.pipelineEntry && this.pipelineEntry.pipeline)
  }

  /** ATTRIBUTES **/

  setAttributesFromGeometry(geometry) {
    this.attributes.geometry = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexArray: geometry.array,
      verticesCount: geometry.verticesCount,
      verticesOrder: geometry.verticesOrder,
      pipelineBuffers: [
        {
          arrayStride: geometry.arrayStride * 4, // (2 + 3) floats, 4 bytes each
          attributes: geometry.attributes.map((attribute, index) => {
            return {
              shaderLocation: index,
              offset: attribute.bufferOffset, // previous attribute size * 4
              format: attribute.bufferFormat,
            }
          }),
        },
      ],
    }

    if (geometry.isIndexed) {
      this.attributes.geometry = {
        ...this.attributes.geometry,
        ...{
          isIndexed: true,
          indexArray: geometry.indexData.array,
          indexBufferFormat: geometry.indexData.bufferFormat,
          indexBufferLength: geometry.indexData.bufferLength,
        },
      }
    }
  }

  createAttributesBuffers() {
    this.attributes.buffers = {
      vertexBuffer: this.renderer.createBuffer({
        label: this.options.label + ': Vertex buffer vertices',
        size: this.attributes.geometry.vertexArray.length * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    }

    this.renderer.queueWriteBuffer(this.attributes.buffers?.vertexBuffer, 0, this.attributes.geometry?.vertexArray)

    if (this.attributes.geometry.isIndexed) {
      this.attributes.buffers.indexBuffer = this.renderer.createBuffer({
        label: this.options.label + ': Index buffer vertices',
        size: this.attributes.geometry.indexArray.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      })

      this.renderer.queueWriteBuffer(this.attributes.buffers?.indexBuffer, 0, this.attributes.geometry.indexArray)
    }
  }

  destroyAttributeBuffers() {
    this.attributes.buffers?.vertexBuffer?.destroy()
    this.attributes.buffers?.indexBuffer?.destroy()
    this.attributes = {
      geometry: null,
      buffers: null,
    }
  }

  /** BIND GROUPS **/

  createBindGroups() {
    const bindGroupStartIndex = this.options.rendering.useProjection ? 1 : 0

    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex) // bindGroup 0 is our renderer camera
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    // then uniforms
    this.uniformsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }

  /**
   *
   * @param pass
   */
  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    // pipeline is not ready yet
    if (!this.ready) return

    super.render(pass)

    // set attributes
    pass.setVertexBuffer(0, this.attributes.buffers?.vertexBuffer)

    if (this.attributes.buffers.indexBuffer) {
      pass.setIndexBuffer(this.attributes.buffers.indexBuffer, this.attributes.geometry?.indexBufferFormat)
    }

    // draw
    if (this.attributes.geometry.indexBufferLength) {
      pass.drawIndexed(this.attributes.geometry.indexBufferLength)
    } else {
      pass.draw(this.attributes.geometry?.verticesCount)
    }
  }

  destroy() {
    super.destroy()
    // destroy attributes buffers
    this.destroyAttributeBuffers()
  }
}
