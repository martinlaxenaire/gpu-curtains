import { BindGroup } from './bindGroups/BindGroup'
import { TextureBindGroup } from './bindGroups/TextureBindGroup'
import { isRenderer } from '../utils/renderer-utils'

export class Material {
  constructor(renderer, { label = 'Material', shaders = {}, uniformsBindings = [], cullMode = 'back' }) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('Material fail')
      return
    }

    this.renderer = renderer

    shaders = {
      ...{
        vertex: {
          code: '',
          entryPoint: 'main',
        },
        fragment: {
          code: '',
          entryPoint: 'main',
        },
      },
      ...shaders,
    }

    this.options = {
      label,
      shaders,
      uniformsBindings,
      cullMode,
    }

    this.pipelineEntry = null
    this.attributes = {
      geometry: null,
      buffers: null,
    }

    this.bindGroups = []

    this.setUniforms()
    this.setTextures()
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

    if (!this.pipelineEntry) {
      this.setPipelineEntry()
    }
  }

  setPipelineEntry() {
    this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ': Render pipeline',
      geometryAttributes: this.attributes.geometry,
      bindGroups: this.bindGroups,
      shaders: this.options.shaders,
      cullMode: this.options.cullMode,
    })
  }

  getShaderCode(shaderType = 'full') {
    if (!this.pipelineEntry) return false

    shaderType = (() => {
      switch (shaderType) {
        case 'vertex':
        case 'fragment':
        case 'full':
          return shaderType
        default:
          return 'full'
      }
    })()

    return this.pipelineEntry.shaders[shaderType].code
  }

  /** ATTRIBUTES **/

  // set from the mesh
  setAttributesFromGeometry(geometry) {
    this.attributes.geometry = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexArray: geometry.array,
      vertexCount: geometry.vertexCount,
      pipelineBuffers: [
        {
          arrayStride: geometry.arrayStride * 4, // (2 + 3) floats, 4 bytes each
          attributes: Object.keys(geometry.attributes).map((attributeKey, index) => {
            const attribute = geometry.attributes[attributeKey]

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
      vertexBuffer: this.renderer.device.createBuffer({
        label: this.options.label + ': Vertex buffer vertices',
        size: this.attributes.geometry.vertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    }

    this.renderer.device.queue.writeBuffer(
      this.attributes.buffers?.vertexBuffer,
      0,
      this.attributes.geometry?.vertexArray
    )

    if (this.attributes.geometry.isIndexed) {
      this.attributes.buffers.indexBuffer = this.renderer.device.createBuffer({
        label: this.options.label + ': Index buffer vertices',
        size: this.attributes.geometry.indexArray.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      })

      this.renderer.device.queue.writeBuffer(
        this.attributes.buffers?.indexBuffer,
        0,
        this.attributes.geometry.indexArray
      )
    }
  }

  destroyAttributeBuffers() {
    this.attributes.buffers?.vertexBuffer?.destroy()
    this.attributes.buffers?.indexBuffer?.destroy()
  }

  /** Bind GROUPS **/

  createBindGroups() {
    // textures first
    if (this.texturesBindGroup.canCreateBindGroup()) {
      this.texturesBindGroup.setIndex(this.bindGroups.length + 1) // bindGroup 0 is our renderer camera
      this.texturesBindGroup.createBindingsBuffers()
      this.texturesBindGroup.setBindGroupLayout()
      this.texturesBindGroup.setBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    // then uniforms
    this.uniformsBindGroups.forEach((bindGroup) => {
      if (bindGroup.canCreateBindGroup()) {
        bindGroup.setIndex(this.bindGroups.length + 1)
        bindGroup.createBindingsBuffers()
        bindGroup.setBindGroupLayout()
        bindGroup.setBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }

  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
  }

  updateBindGroups() {
    this.bindGroups.forEach((bindGroup) => {
      if (bindGroup.needsPipelineFlush) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups)
        bindGroup.needsPipelineFlush = false
      }

      bindGroup.updateBindings()
    })
  }

  /** UNIFORMS **/

  setUniforms() {
    this.uniforms = {}
    this.uniformsBindGroups = []

    const uniformsBindGroup = new BindGroup({
      label: this.options.label + ': Uniform bind group',
      renderer: this.renderer,
    })

    this.options.uniformsBindings.forEach((uniformBinding) => {
      this.uniforms = { ...this.uniforms, ...uniformBinding.uniforms }

      uniformBinding.isActive =
        this.options.shaders.vertex.code.indexOf(uniformBinding.name + '.') !== -1 ||
        this.options.shaders.fragment.code.indexOf(uniformBinding.name + '.') !== -1

      uniformsBindGroup.addBinding(uniformBinding)
    })

    this.uniformsBindGroups.push(uniformsBindGroup)
  }

  /** TEXTURES **/

  setTextures() {
    this.textures = []
    this.texturesBindGroup = new TextureBindGroup({
      label: this.options.label + ': Textures bind group',
      renderer: this.renderer,
    })
  }

  addTextureBinding(texture) {
    this.textures.push(texture)
    this.texturesBindGroup.addTexture(texture)
  }

  /** Render loop **/

  /**
   *
   * @param pass
   */
  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    // set our material if needed
    this.setMaterial()

    // pipeline is not ready yet
    if (!this.pipelineEntry || !this.pipelineEntry.pipeline) return

    this.texturesBindGroup?.textures.forEach((texture, textureIndex) => {
      // since external texture are destroyed as soon as JavaScript returns to the browser
      // we need to update it at every tick, even if it hasn't changed
      // to ensure we're not sending a stale / destroyed texture
      // anyway, external texture are cached so it is fined to call importExternalTexture at each tick
      if (texture.options.sourceType === 'video') {
        texture.shouldUpdate = true
      } else if (texture.options.sourceType === 'canvas') {
        texture.shouldUpdate = true
      }

      if (texture.shouldUpdate) {
        if (texture.options.sourceType === 'video') {
          texture.uploadVideoTexture()

          if (this.texturesBindGroup.shouldUpdateVideoTextureBindGroupLayout(textureIndex)) {
            this.texturesBindGroup.updateVideoTextureBindGroupLayout(textureIndex)
          }
        } else {
          texture.uploadTexture()
        }
      }

      if (texture.shouldUpdateBindGroup) {
        this.texturesBindGroup.resetTextureBindGroup(textureIndex)
        texture.shouldUpdateBindGroup = false
      }
    })

    // update uniforms buffers
    this.updateBindGroups()

    // set current pipeline
    // TODO this could be improved if we'd render meshes by pipelines order
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry)

    // set bind groups
    this.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
    })

    // set attributes
    pass.setVertexBuffer(0, this.attributes.buffers?.vertexBuffer)

    if (this.attributes.buffers.indexBuffer) {
      pass.setIndexBuffer(this.attributes.buffers?.indexBuffer, this.attributes.geometry?.indexBufferFormat)
    }

    // draw
    if (this.attributes.geometry.indexBufferLength) {
      pass.drawIndexed(this.attributes.geometry?.indexBufferLength)
    } else {
      pass.draw(this.attributes.geometry?.vertexCount)
    }
  }

  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyAttributeBuffers()
    this.destroyBindGroups()
  }
}
