import { BindGroup } from './bindings/BindGroup'
import { TextureBindGroup } from './bindings/TextureBindGroup'
import { ShaderChunks } from './shaders/ShaderChunks'

export class Material {
  constructor(renderer, { label = 'Material', shaders = {}, uniformsBindings = [], geometry = {} }) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || !(renderer.type === 'Renderer' || renderer.type === 'CurtainsRenderer')) {
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
    }

    this.state = {
      vertexShaderModule: null,
      fragmentShaderModule: null,
      pipelineEntry: null,
      attributesBuffers: null,
      bindGroups: [],
    }

    this.setAttributesFromGeometry(geometry)
    this.setUniforms()
    this.setTextures()
  }

  setMaterial() {
    if (!this.state.attributesBuffers) {
      this.createAttributesBuffers()
    }

    const texturesBindGroupLength = 1
    const bindGroupsReady = this.state.bindGroups.length === this.uniformsBindGroups.length + texturesBindGroupLength

    // TODO cache bind groups and pipelines?
    // https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change
    if (!bindGroupsReady) {
      this.createBindGroups()
      return
    }

    if (!this.state.pipelineEntry) {
      this.setPipelineEntry()
    }
  }

  setPipelineEntry() {
    this.state.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
      label: this.options.label + ': Render pipeline',
      attributes: this.attributes,
      bindGroups: this.state.bindGroups,
      shaders: this.options.shaders,
    })
  }

  /** ATTRIBUTES **/

  setAttributesFromGeometry(geometry) {
    this.attributes = {
      wgslStructFragment: geometry.wgslStructFragment,
      vertexArray: geometry.value,
      indexArray: geometry.indexData.array,
      indexBufferFormat: geometry.indexData.bufferFormat,
      indexBufferLength: geometry.indexData.bufferLength,
      pipelineBuffers: [
        {
          arrayStride: geometry.arrayStride, // (2 + 3) floats, 4 bytes each
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
  }

  createAttributesBuffers() {
    this.state.attributesBuffers = {
      vertexBuffer: this.renderer.device.createBuffer({
        label: this.options.label + ': Vertex buffer vertices',
        size: this.attributes.vertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
      indexBuffer: this.renderer.device.createBuffer({
        label: this.options.label + ': Index buffer vertices',
        size: this.attributes.indexArray.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      }),
    }

    this.renderer.device.queue.writeBuffer(this.state.attributesBuffers.vertexBuffer, 0, this.attributes.vertexArray)
    this.renderer.device.queue.writeBuffer(this.state.attributesBuffers.indexBuffer, 0, this.attributes.indexArray)
  }

  destroyAttributeBuffers() {
    this.state.attributesBuffers?.vertexBuffer?.destroy()
    this.state.attributesBuffers?.indexBuffer?.destroy()
  }

  /** UNIFORMS **/

  setUniforms() {
    this.uniforms = {}
    this.uniformsBindGroups = []

    const uniformsBindGroup = new BindGroup({
      renderer: this.renderer,
    })

    this.options.uniformsBindings.forEach((uniformBinding, index) => {
      this.uniforms = { ...this.uniforms, ...uniformBinding.uniforms }

      uniformBinding.isActive =
        this.options.shaders.vertex.code.indexOf(uniformBinding.name + '.') !== -1 ||
        this.options.shaders.fragment.code.indexOf(uniformBinding.name + '.') !== -1

      uniformsBindGroup.addBinding(uniformBinding)
    })

    this.uniformsBindGroups.push(uniformsBindGroup)
  }

  createBindGroups() {
    // textures first
    if (this.texturesBindGroup.canCreateBindGroup()) {
      this.texturesBindGroup.setIndex(this.state.bindGroups.length)
      this.texturesBindGroup.createBindingsBuffers()
      this.texturesBindGroup.setBindGroupLayout()
      this.texturesBindGroup.setBindGroup()

      this.state.bindGroups.push(this.texturesBindGroup)
    }

    // then uniforms
    this.uniformsBindGroups.forEach((bindGroup) => {
      if (bindGroup.canCreateBindGroup()) {
        bindGroup.setIndex(this.state.bindGroups.length)
        bindGroup.createBindingsBuffers()
        bindGroup.setBindGroupLayout()
        bindGroup.setBindGroup()

        this.state.bindGroups.push(bindGroup)
      }
    })
  }

  destroyBindGroups() {
    this.state.bindGroups.forEach((bindGroup) => bindGroup.destroy())
  }

  updateBindGroups() {
    this.state.bindGroups.forEach((bindGroup) => {
      if (bindGroup.needsPipelineFlush) {
        this.state.pipelineEntry.flushPipelineEntry(this.state.bindGroups)
        bindGroup.needsPipelineFlush = false
      }

      bindGroup.updateBindings()
    })
  }

  /** TEXTURES **/

  setTextures() {
    this.textures = []
    this.texturesBindGroup = new TextureBindGroup({
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
    if (!this.state.pipelineEntry || !this.state.pipelineEntry.pipeline) return

    // update textures
    this.texturesBindGroup?.textures.forEach((texture, textureIndex) => {
      if (texture.options.sourceType === 'video' && !texture.videoFrameCallbackId) {
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

      if (texture.shouldBindGroup) {
        this.texturesBindGroup.resetTextureBindGroup(textureIndex)
        texture.shouldBindGroup = false
      }
    })

    // update uniforms buffers
    this.updateBindGroups()

    // set current pipeline
    // TODO this could be improved if we'd render mesh by pipelines order
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.state.pipelineEntry)

    // set attributes
    pass.setVertexBuffer(0, this.state.attributesBuffers.vertexBuffer)
    pass.setIndexBuffer(this.state.attributesBuffers.indexBuffer, this.attributes.indexBufferFormat)

    // set bind groups
    this.state.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
    })

    // draw
    pass.drawIndexed(this.attributes.indexBufferLength)
  }

  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyAttributeBuffers()
    this.destroyBindGroups()
  }
}
