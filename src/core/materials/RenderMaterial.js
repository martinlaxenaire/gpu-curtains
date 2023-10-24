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

    let { shaders, label, useAsyncPipeline, inputs, inputBindGroups, geometry, ...renderingOptions } = parameters

    if (!shaders.vertex.entryPoint) {
      shaders.vertex.entryPoint = 'main'
    }

    if (!shaders.fragment.entryPoint) {
      shaders.fragment.entryPoint = 'main'
    }

    this.options = {
      ...this.options,
      shaders,
      label,
      ...(useAsyncPipeline !== undefined && { useAsyncPipeline }),
      ...(inputs !== undefined && { inputs }),
      ...(inputBindGroups !== undefined && { inputBindGroups }),
      rendering: { ...renderingOptions, verticesOrder: geometry.verticesOrder },
    }

    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      ...this.options.rendering,
    })

    this.attributes = {}

    this.setAttributesFromGeometry(geometry)
  }

  setMaterial() {
    if (!this.attributes.buffers) {
      this.createAttributesBuffers()
    }

    // camera + model bind groups
    const modelBindGroupLength = this.inputsBindGroups.length
    const texturesBindGroupLength = 1
    const bindGroupsReady = this.bindGroups.length === modelBindGroupLength + texturesBindGroupLength

    // TODO cache bind groups and pipelines?
    // https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change
    if (!bindGroupsReady) {
      this.createBindGroups()
      return
    }

    if (this.pipelineEntry && this.pipelineEntry.canCompile) {
      this.setPipelineEntryBuffers()
    }
  }

  setPipelineEntryBuffers() {
    this.pipelineEntry.setPipelineEntryBuffers({
      attributes: this.attributes,
      bindGroups: this.bindGroups,
    })
  }

  get ready() {
    return !!(this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  /** ATTRIBUTES **/

  setAttributesFromGeometry(geometry) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      verticesCount: geometry.verticesCount,
      instancesCount: geometry.instancesCount,
      verticesOrder: geometry.verticesOrder,
      vertexBuffers: geometry.vertexBuffers,
    }
  }

  createAttributesBuffers() {
    this.attributes.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.buffer = this.renderer.createBuffer({
        label: this.options.label + ': Vertex buffer vertices',
        size: vertexBuffer.array.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      })

      this.renderer.queueWriteBuffer(vertexBuffer.buffer, 0, vertexBuffer.array)

      if (vertexBuffer.indexBuffer) {
        vertexBuffer.indexBuffer.buffer = this.renderer.createBuffer({
          label: this.options.label + ': Index buffer vertices',
          size: vertexBuffer.indexBuffer.array.byteLength,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        })

        this.renderer.queueWriteBuffer(vertexBuffer.indexBuffer.buffer, 0, vertexBuffer.indexBuffer.array)
      }
    })
  }

  destroyAttributeBuffers() {
    this.attributes.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.buffer?.destroy()
      vertexBuffer.indexBuffer?.buffer?.destroy()
    })

    this.attributes.vertexBuffers = []
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
    this.inputsBindGroups.forEach((bindGroup) => {
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
    this.attributes.vertexBuffers.forEach((vertexBuffer, index) => {
      pass.setVertexBuffer(index, vertexBuffer.buffer)

      if (vertexBuffer.indexBuffer) {
        pass.setIndexBuffer(vertexBuffer.indexBuffer.buffer, vertexBuffer.indexBuffer.bufferFormat)
      }
    })

    // draw
    if (this.attributes.vertexBuffers[0].indexBuffer) {
      pass.drawIndexed(this.attributes.vertexBuffers[0].indexBuffer.bufferLength, this.attributes.instancesCount)
    } else {
      pass.draw(this.attributes.verticesCount, this.attributes.instancesCount)
    }
  }

  destroy() {
    super.destroy()
    // destroy attributes buffers
    this.destroyAttributeBuffers()
  }
}
