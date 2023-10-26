import { Material } from './Material'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { CameraRenderer, isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import {
  AllowedGeometries,
  RenderMaterialAttributes,
  RenderMaterialParams,
} from '../../types/core/materials/RenderMaterial'
import { MaterialOptions } from '../../types/core/materials/Material'
import { RenderPipelineEntryBaseParams } from '../../types/core/pipelines/RenderPipelineEntry'

export class RenderMaterial extends Material {
  attributes: RenderMaterialAttributes | null

  constructor(renderer: Renderer | GPUCurtains, parameters: RenderMaterialParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    const type = 'RenderMaterial'

    isRenderer(renderer, type)

    super(renderer, parameters)

    this.type = type
    this.renderer = renderer

    const { shaders, label, useAsyncPipeline, inputs, inputBindGroups, geometry, ...renderingOptions } = parameters

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
    } as MaterialOptions

    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ' render pipeline',
      shaders: this.options.shaders,
      useAsync: this.options.useAsyncPipeline,
      ...this.options.rendering,
    } as RenderPipelineEntryBaseParams)

    this.attributes = null

    this.setAttributesFromGeometry(geometry)
  }

  setMaterial() {
    if (!this.attributes?.vertexBuffers[0].buffer) {
      this.createAttributesBuffers()
    }

    super.setMaterial()

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

  get ready(): boolean {
    return !!(this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  /** ATTRIBUTES **/

  setAttributesFromGeometry(geometry: AllowedGeometries) {
    if (geometry.shouldCompute) {
      geometry.computeGeometry()
    }

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
    // camera first!
    if ((this.renderer as CameraRenderer).cameraBindGroup && this.options.rendering.useProjection) {
      this.bindGroups.push((this.renderer as CameraRenderer).cameraBindGroup)
    }

    super.createBindGroups()
  }

  /**
   *
   * @param pass
   */
  render(pass: GPURenderPassEncoder) {
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
