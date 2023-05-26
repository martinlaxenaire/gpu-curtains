export class Material {
  constructor(
    renderer,
    { label = 'Material', vertexShader = '', fragmentShader = '', uniformsBindings = [], geometry = {} }
  ) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    this.renderer = renderer

    this.options = {
      label,
      vertexShader,
      fragmentShader,
      uniformsBindings,
    }

    this.shaders = {
      vertex: '',
      fragment: '',
      code: null,
    }

    this.state = {
      vertexShaderModule: null,
      fragmentShaderModule: null,
      pipeline: null,
      attributesBuffers: null,
      uniformsGroups: [],
      texturesBindings: [],
    }

    this.setAttributesFromGeometry(geometry)
    this.setUniforms()
  }

  patchShaders() {
    this.shaders.vertex = this.options.vertexShader
    this.shaders.fragment = this.options.fragmentShader

    this.state.texturesBindings.toReversed().forEach((textureBinding) => {
      textureBinding.texture.uniformGroup.bindings.toReversed().forEach((binding) => {
        this.shaders.vertex = `${binding.wgslGroupFragment}\n ${this.shaders.vertex}`
        this.shaders.fragment = `${binding.wgslGroupFragment}\n ${this.shaders.fragment}`
      })

      this.shaders.vertex = `\n ${this.shaders.vertex}`
      this.shaders.fragment = `\n ${this.shaders.fragment}`
    })

    this.uniformsGroups.toReversed().forEach((uniformGroup) => {
      uniformGroup.bindings.toReversed().forEach((uniformBinding) => {
        this.shaders.vertex = `${uniformBinding.wgslGroupFragment}\n ${this.shaders.vertex}`
        this.shaders.vertex = `${uniformBinding.wgslStructFragment}\n ${this.shaders.vertex}`

        this.shaders.fragment = `${uniformBinding.wgslGroupFragment}\n ${this.shaders.fragment}`
        this.shaders.fragment = `${uniformBinding.wgslStructFragment}\n ${this.shaders.fragment}`
      })
    })

    this.shaders.vertex = `${this.attributes.wgslStructFragment}\n ${this.shaders.vertex}`
    this.shaders.fragment = `${this.attributes.wgslStructFragment}\n ${this.shaders.fragment}`

    this.shaders.code = this.shaders.vertex + '\n' + this.shaders.fragment
  }

  setMaterial() {
    if (!this.shaders.code) {
      this.patchShaders()
    }

    if (!this.state.vertexShaderModule) {
      this.state.vertexShaderModule = this.createShaderModule({
        code: this.shaders.vertex,
        type: 'Vertex',
      })
    }

    if (!this.state.fragmentShaderModule) {
      this.state.fragmentShaderModule = this.createShaderModule({
        code: this.shaders.fragment,
        type: 'Fragment',
      })
    }

    if (!this.state.pipeline) {
      this.createRenderPipeline()
    }

    if (!this.state.attributesBuffers) {
      this.createAttributesBuffers()
    }

    if (!this.state.uniformsGroups.length && this.uniformsGroups.length) {
      this.createUniformsBindings()
    }
  }

  /** PROGRAM / PIPELINE **/

  /**
   * Creates a device shader module
   *
   * @param code
   */
  createShaderModule({ code = '', type = '' }) {
    return this.renderer.device.createShaderModule({
      label: this.options.label + ': ' + type + 'Shader module',
      code,
    })
  }

  createRenderPipeline() {
    if (!this.state.vertexShaderModule || !this.state.fragmentShaderModule) return

    this.state.pipeline = this.renderer.device.createRenderPipeline({
      label: this.options.label + ': Render pipeline',
      layout: 'auto',
      vertex: {
        module: this.state.vertexShaderModule,
        entryPoint: 'vs', // TODO editable via options?
        buffers: this.attributes.pipelineBuffers,
      },
      fragment: {
        module: this.state.fragmentShaderModule,
        entryPoint: 'fs', // TODO editable via options?
        targets: [{ format: this.renderer.preferredFormat }],
      },
      multisample: {
        count: this.renderer.sampleCount,
      },
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

  /** UNIFORMS **/

  setUniforms() {
    this.uniforms = {}
    this.uniformsGroups = []

    this.options.uniformsBindings.forEach((uniformBinding) => {
      this.uniforms = { ...this.uniforms, ...uniformBinding.uniforms }

      if (!this.uniformsGroups[uniformBinding.groupIndex]) {
        this.uniformsGroups[uniformBinding.groupIndex] = {
          groupIndex: uniformBinding.groupIndex,
          bindings: [],
        }
      }

      this.uniformsGroups[uniformBinding.groupIndex].bindings.push(uniformBinding)
    })
  }

  createUniformsBindings() {
    this.uniformsGroups.forEach((uniformGroup, index) => {
      const uniformBuffers = []

      uniformGroup.bindings.forEach((uniformBinding) => {
        const uniformBuffer = this.renderer.device.createBuffer({
          label: this.options.label + ': Uniforms buffer from:' + uniformBinding.label,
          size: uniformBinding.value.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        uniformBuffers.push(uniformBuffer)
      })

      const bindGroup = this.renderer.device.createBindGroup({
        label: this.options.label + ': Uniform bind group',
        layout: this.state.pipeline.getBindGroupLayout(uniformGroup.groupIndex),
        entries: uniformGroup.bindings.map((uniformBinding, index) => {
          return {
            binding: uniformBinding.bindIndex,
            resource: {
              buffer: uniformBuffers[index],
            },
          }
        }),
      })

      this.state.uniformsGroups.push({
        uniformGroup,
        uniformBuffers,
        bindGroup,
      })
    })
  }

  updateUniformBinding(uniformGroup) {
    uniformGroup.uniformGroup.bindings.forEach((uniformBinding, index) => {
      if (uniformBinding.shouldUpdate) {
        const bufferOffset = 0
        this.renderer.device.queue.writeBuffer(uniformGroup.uniformBuffers[index], bufferOffset, uniformBinding.value)
      }

      uniformBinding.shouldUpdate = false
    })
  }

  /** TEXTURES **/

  addTextureBinding(texture) {
    this.state.texturesBindings.push({
      texture,
      index: this.state.texturesBindings.length, // useful for uniform bindings
      matrixUniformBuffer: null,
      bindGroup: null,
    })
  }

  createTextureBuffer(textureBinding, texture) {
    if (!textureBinding.matrixUniformBuffer) {
      textureBinding.matrixUniformBuffer = this.renderer.device.createBuffer({
        label: this.options.label + ': Uniforms buffer from:' + texture.textureMatrix.label,
        size: texture.textureMatrix.value.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })
    }
  }

  createTextureBindGroup(textureBinding, texture) {
    if (texture.shouldBindGroup) {
      textureBinding.bindGroup = this.renderer.device.createBindGroup({
        label: 'Texture',
        layout: this.state.pipeline.getBindGroupLayout(1),
        entries: [
          { binding: textureBinding.index * 3, resource: texture.sampler },
          {
            binding: textureBinding.index * 3 + 1,
            resource: texture.texture.createView(),
          },
          {
            binding: textureBinding.index * 3 + texture.textureMatrix.bindIndex,
            resource: { buffer: textureBinding.matrixUniformBuffer },
          },
        ],
      })
    }

    texture.shouldBindGroup = false
  }

  updateTextureBinding(textureBinding, texture) {
    if (texture.textureMatrix.shouldUpdate) {
      const bufferOffset = 0
      this.renderer.device.queue.writeBuffer(
        textureBinding.matrixUniformBuffer,
        bufferOffset,
        texture.textureMatrix.value
      )

      texture.textureMatrix.shouldUpdate = false
    }
  }

  updateTexture(textureBinding) {
    const { texture } = textureBinding

    if (texture.shouldUpdate) {
      texture.uploadTexture(this.renderer.device)
    }

    this.createTextureBuffer(textureBinding, texture)
    this.createTextureBindGroup(textureBinding, texture)
    this.updateTextureBinding(textureBinding, texture)
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

    // update uniforms buffers
    this.state.uniformsGroups.forEach((uniformGroup) => {
      this.updateUniformBinding(uniformGroup)
    })

    // set pipeline
    pass.setPipeline(this.state.pipeline)

    // set attributes
    pass.setVertexBuffer(0, this.state.attributesBuffers.vertexBuffer)
    pass.setIndexBuffer(this.state.attributesBuffers.indexBuffer, this.attributes.indexBufferFormat)

    // set uniforms
    this.state.uniformsGroups.forEach((uniformGroup) => {
      pass.setBindGroup(uniformGroup.uniformGroup.groupIndex, uniformGroup.bindGroup)
    })

    // update textures
    this.state.texturesBindings.forEach((texture) => {
      this.updateTexture(texture)
      pass.setBindGroup(1, texture.bindGroup)
    })

    // draw
    pass.drawIndexed(this.attributes.indexBufferLength)
  }
}
