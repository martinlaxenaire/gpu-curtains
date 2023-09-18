import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class Material {
  constructor(renderer, parameters) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

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

    this.bindGroups = []

    this.setAttributesFromGeometry(geometry)
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

  getShaderCode(shaderType = 'full') {
    if (!this.pipelineEntry) return ''

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

  getAddedShaderCode(shaderType = 'vertex') {
    if (!this.pipelineEntry) return ''

    shaderType = (() => {
      switch (shaderType) {
        case 'vertex':
        case 'fragment':
          return shaderType
        default:
          return 'vertex'
      }
    })()

    return this.pipelineEntry.shaders[shaderType].head
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

  /** Bind GROUPS **/

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

  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.texturesBindGroup = null
    this.uniformsBindGroups = []
    this.bindGroups = []
  }

  updateBindGroups() {
    this.bindGroups.forEach((bindGroup) => {
      if (bindGroup.needsReset) {
        bindGroup.resetBindGroup()
        bindGroup.needsReset = false
      }

      if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
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

    if (this.options.uniformsBindings.length) {
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
  }

  shouldUpdateUniformsBindings(bufferBindingName, uniformName) {
    if (!bufferBindingName) return

    const bufferBinding = this.options.uniformsBindings.find((bB) => bB.name === bufferBindingName)
    if (bufferBinding) {
      if (!uniformName) {
        Object.keys(bufferBinding.uniforms).forEach((uniformKey) => bufferBinding.shouldUpdateUniform(uniformKey))
      } else {
        bufferBinding.shouldUpdateUniform(uniformName)
      }
    }
  }

  /** TEXTURES **/

  setTextures() {
    this.textures = []
    this.texturesBindGroup = new TextureBindGroup({
      label: this.options.label + ': Textures bind group',
      renderer: this.renderer,
    })
  }

  addTexture(texture) {
    this.textures.push(texture)

    // is it used in our shaders?
    if (
      this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 ||
      this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1
    ) {
      this.texturesBindGroup.addTexture(texture)
    }
  }

  destroyTextures() {
    this.textures?.forEach((texture) => texture.destroy())
    this.textures = []
  }

  /** Render loop **/

  onBeforeRender() {
    // set our material if needed
    this.setMaterial()

    // first what needs to be done for all textures
    this.textures.forEach((texture) => {
      // RenderTextures does not have a render method
      texture.render && texture.render()
    })

    // then what needs to be done only for textures actually used in our shaders
    this.texturesBindGroup?.textures.forEach((texture, textureIndex) => {
      // copy textures that need it on first init, but only when original texture is ready
      if (
        texture.type === 'Texture' &&
        texture.options.fromTexture &&
        texture.options.fromTexture.sourceUploaded &&
        !texture.sourceUploaded
      ) {
        texture.copy(texture.options.fromTexture)
      }

      if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === 'externalVideo') {
        texture.uploadVideoTexture()

        if (this.texturesBindGroup.shouldUpdateVideoTextureBindGroupLayout(textureIndex)) {
          this.texturesBindGroup.updateVideoTextureBindGroupLayout(textureIndex)
        }
      }

      if (texture.shouldUpdateBindGroup && texture.texture) {
        this.texturesBindGroup.resetTextureBindGroup()
        texture.shouldUpdateBindGroup = false
      }
    })

    this.options.uniformsBindings.forEach((uniformBinding) => {
      uniformBinding.onBeforeRender()
    })

    // update uniforms buffers
    this.updateBindGroups()
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

    // set current pipeline
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry)

    // set bind groups
    this.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
    })

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
    // destroy all buffers created with createBuffer
    this.destroyAttributeBuffers()
    this.destroyBindGroups()
    this.destroyTextures()
  }
}
