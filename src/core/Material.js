export class Material {
  constructor(renderer, { label = 'Material', shaders = {}, uniformsBindings = [], geometry = {} }) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    this.renderer = renderer

    shaders = {
      ...{
        // TODO default
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
      texturesGroup: [],
    }

    this.setAttributesFromGeometry(geometry)
    this.setUniforms()
    this.setTextures()
  }

  patchShaders() {
    this.shaders.vertex = this.options.shaders.vertex.code
    this.shaders.fragment = this.options.shaders.fragment.code

    this.state.texturesGroup.toReversed().forEach((textureGroup) => {
      if (!textureGroup.isActive) return

      let bindIndex = textureGroup.bindings.length - 1

      textureGroup.bindings.toReversed().forEach((textureBinding) => {
        this.shaders.vertex = `@group(${textureGroup.groupIndex}) @binding(${bindIndex}) ${textureBinding.wgslGroupFragment}\n ${this.shaders.vertex}`
        this.shaders.fragment = `@group(${textureGroup.groupIndex}) @binding(${bindIndex}) ${textureBinding.wgslGroupFragment}\n ${this.shaders.fragment}`

        bindIndex--
      })

      this.shaders.vertex = `\n ${this.shaders.vertex}`
      this.shaders.fragment = `\n ${this.shaders.fragment}`
    })

    this.uniformsGroups.toReversed().forEach((uniformGroup) => {
      uniformGroup.bindings.toReversed().forEach((uniformBinding) => {
        // patch shader only if the uniform struct is actually used
        if (uniformBinding.isActive) {
          this.shaders.vertex = `@group(${uniformBinding.groupIndex}) @binding(${uniformBinding.bindIndex}) ${uniformBinding.wgslGroupFragment}\n ${this.shaders.vertex}`
          this.shaders.vertex = `${uniformBinding.wgslStructFragment}\n ${this.shaders.vertex}`

          this.shaders.fragment = `@group(${uniformBinding.groupIndex}) @binding(${uniformBinding.bindIndex}) ${uniformBinding.wgslGroupFragment}\n ${this.shaders.fragment}`
          this.shaders.fragment = `${uniformBinding.wgslStructFragment}\n ${this.shaders.fragment}`
        }
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

    if (this.state.texturesGroup.length) {
      this.createTexturesBindGroup()
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

    // TODO handle culling, depth, etc here

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
      ...(this.renderer.sampleCount > 1 && {
        multisample: {
          count: this.renderer.sampleCount,
        },
      }),
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
    this.uniformsGroups = []

    this.options.uniformsBindings.forEach((uniformBinding) => {
      this.uniforms = { ...this.uniforms, ...uniformBinding.uniforms }

      if (!this.uniformsGroups[uniformBinding.groupIndex]) {
        this.uniformsGroups[uniformBinding.groupIndex] = {
          groupIndex: uniformBinding.groupIndex,
          bindings: [],
        }
      }

      const isActive =
        this.options.shaders.vertex.code.indexOf(uniformBinding.name + '.') !== -1 ||
        this.options.shaders.fragment.code.indexOf(uniformBinding.name + '.') !== -1

      uniformBinding.isActive = isActive

      if (
        this.options.shaders.vertex.code.indexOf(uniformBinding.name + '.') === -1 &&
        this.options.shaders.fragment.code.indexOf(uniformBinding.name + '.') === -1
      ) {
        console.warn('THIS UNIFORM IS NOT USED IN THE SHADERS!', uniformBinding.name)
        //return
      }

      this.uniformsGroups[uniformBinding.groupIndex].bindings.push(uniformBinding)
    })
  }

  createUniformsBindings() {
    this.uniformsGroups.forEach((uniformGroup, index) => {
      const uniformBuffers = []

      uniformGroup.bindings
        .filter((uniformBinding) => uniformBinding.isActive)
        .forEach((uniformBinding) => {
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
        entries: uniformGroup.bindings
          .filter((uniformBinding) => uniformBinding.isActive)
          .map((uniformBinding, index) => {
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

  destroyUniformBindings() {
    this.state.uniformsGroups.forEach((uniformGroup) => {
      uniformGroup.uniformBuffers.forEach((uniformBuffer) => {
        uniformBuffer.destroy()
      })
    })
  }

  updateUniformBinding(uniformGroup) {
    uniformGroup.uniformGroup.bindings
      .filter((uniformBinding) => uniformBinding.isActive)
      .forEach((uniformBinding, index) => {
        if (uniformBinding.shouldUpdate) {
          const bufferOffset = 0
          this.renderer.device.queue.writeBuffer(uniformGroup.uniformBuffers[index], bufferOffset, uniformBinding.value)
        }

        uniformBinding.shouldUpdate = false
      })
  }

  /** TEXTURES **/

  setTextures() {
    this.state.texturesGroup = []
    this.textures = []
  }

  addTextureBinding(texture) {
    const textureBinding = {
      texture,
      matrixUniformBuffer: null,
    }

    this.textures.push(texture)

    this.state.texturesGroup.push({
      groupIndex: this.state.texturesGroup.length + 1,
      bindGroup: null,
      texture,
      matrixUniformBuffer: null,
      bindings: textureBinding.texture.uniformGroup.bindings,
      isActive:
        this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 ||
        this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1,
    })
  }

  createTextureBuffer(textureGroup, texture) {
    if (!textureGroup.matrixUniformBuffer) {
      textureGroup.matrixUniformBuffer = this.renderer.device.createBuffer({
        label: this.options.label + ': Uniforms buffer from: ' + texture.textureMatrix.label,
        size: texture.textureMatrix.value.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })
    }
  }

  destroyTextureBuffer(textureGroup) {
    textureGroup.matrixUniformBuffer?.destroy()
  }

  createTexturesBindGroup() {
    this.state.texturesGroup
      //.filter((textureGroup) => textureGroup.isActive)
      .forEach((textureGroup) => {
        if (!textureGroup.bindGroup && textureGroup.isActive) {
          const { texture } = textureGroup
          this.createTextureBuffer(textureGroup, texture)
          this.setTextureBindGroup(textureGroup, texture)
        }
      })
  }

  setTextureBindGroup(textureGroup, texture) {
    textureGroup.bindGroup = this.renderer.device.createBindGroup({
      label: `Texture ${texture.options.name} bind group`,
      layout: this.state.pipeline.getBindGroupLayout(textureGroup.groupIndex),
      entries: [
        { binding: 0, resource: texture.sampler },
        {
          binding: 1,
          resource: texture.texture.createView(),
        },
        {
          binding: 2,
          resource: { buffer: textureGroup.matrixUniformBuffer },
        },
      ],
    })

    texture.shouldBindGroup = false
  }

  updateTextureBinding(textureGroup, texture) {
    if (texture.textureMatrix.shouldUpdate) {
      const bufferOffset = 0
      this.renderer.device.queue.writeBuffer(
        textureGroup.matrixUniformBuffer,
        bufferOffset,
        texture.textureMatrix.value
      )

      texture.textureMatrix.shouldUpdate = false
    }
  }

  updateTextureGroup(textureGroup) {
    const { texture } = textureGroup

    if (texture.shouldUpdate) {
      texture.uploadTexture(this.renderer.device)
    }

    if (texture.shouldBindGroup) {
      this.setTextureBindGroup(textureGroup, texture)
    }

    this.updateTextureBinding(textureGroup, texture)
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
    this.state.texturesGroup.forEach((textureGroup) => {
      if (!textureGroup.isActive) return

      this.updateTextureGroup(textureGroup)
      pass.setBindGroup(textureGroup.groupIndex, textureGroup.bindGroup)
    })

    // draw
    pass.drawIndexed(this.attributes.indexBufferLength)
  }

  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyAttributeBuffers()
    this.destroyUniformBindings()

    this.state.texturesGroup.forEach((textureGroup) => {
      this.destroyTextureBuffer(textureGroup)
    })
  }
}
