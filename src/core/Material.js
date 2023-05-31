import { BindGroup } from './bindings/BindGroup'
import { TextureBindGroup } from './bindings/TextureBindGroup'

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
      bindGroups: [],
    }

    this.setAttributesFromGeometry(geometry)
    this.setUniforms()
    this.setTextures()
  }

  patchShaders() {
    this.shaders.vertex = this.options.shaders.vertex.code
    this.shaders.fragment = this.options.shaders.fragment.code

    this.state.bindGroups.toReversed().forEach((bindGroup) => {
      bindGroup.bindings.toReversed().forEach((binding) => {
        this.shaders.vertex = `@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.vertex}`
        this.shaders.fragment = `@group(${bindGroup.index}) @binding(${binding.bindIndex}) ${binding.wgslGroupFragment} ${this.shaders.fragment}`

        this.shaders.vertex = `\n ${this.shaders.vertex}`
        this.shaders.fragment = `\n ${this.shaders.fragment}`

        if (binding.wgslStructFragment) {
          this.shaders.vertex = `${binding.wgslStructFragment}\n ${this.shaders.vertex}`
          this.shaders.fragment = `${binding.wgslStructFragment}\n ${this.shaders.fragment}`
        }
      })

      this.shaders.vertex = `\n ${this.shaders.vertex}`
      this.shaders.fragment = `\n ${this.shaders.fragment}`
    })

    this.shaders.vertex = `${this.attributes.wgslStructFragment}\n ${this.shaders.vertex}`
    this.shaders.fragment = `${this.attributes.wgslStructFragment}\n ${this.shaders.fragment}`

    this.shaders.code = this.shaders.vertex + '\n' + this.shaders.fragment
  }

  setMaterial() {
    if (!this.state.attributesBuffers) {
      this.createAttributesBuffers()
    }

    const bindGroupsReady =
      this.state.bindGroups.length === this.uniformsBindGroups.length + this.texturesBindGroups.length

    if (!bindGroupsReady) {
      this.createBindGroups()
      return
    }

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

    this.state.pipelineLayout = this.renderer.device.createPipelineLayout({
      bindGroupLayouts: this.state.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout),
    })

    this.state.pipeline = this.renderer.device.createRenderPipeline({
      label: this.options.label + ': Render pipeline',
      layout: this.state.pipelineLayout,
      vertex: {
        module: this.state.vertexShaderModule,
        entryPoint: this.options.shaders.vertex.entryPoint, // TODO editable via options?
        buffers: this.attributes.pipelineBuffers,
      },
      fragment: {
        module: this.state.fragmentShaderModule,
        entryPoint: this.options.shaders.fragment.entryPoint, // TODO editable via options?
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
    this.uniformsBindGroups = []

    this.options.uniformsBindings.forEach((uniformBinding) => {
      this.uniforms = { ...this.uniforms, ...uniformBinding.uniforms }

      if (!this.uniformsBindGroups[uniformBinding.groupIndex]) {
        this.uniformsBindGroups[uniformBinding.groupIndex] = new BindGroup({
          renderer: this.renderer,
        })
      }

      uniformBinding.isActive =
        this.options.shaders.vertex.code.indexOf(uniformBinding.name + '.') !== -1 ||
        this.options.shaders.fragment.code.indexOf(uniformBinding.name + '.') !== -1

      this.uniformsBindGroups[uniformBinding.groupIndex].addBinding(uniformBinding)
    })
  }

  createBindGroups() {
    // uniforms first
    this.uniformsBindGroups.forEach((bindGroup) => {
      if (bindGroup.canCreateBindGroup()) {
        bindGroup.setIndex(this.state.bindGroups.length)
        bindGroup.createBindingsBuffers()
        bindGroup.setBindGroupLayout()
        bindGroup.setBindGroup()

        this.state.bindGroups.push(bindGroup)
      }
    })

    // then textures
    this.texturesBindGroups.forEach((bindGroup) => {
      if (bindGroup.canCreateBindGroup()) {
        bindGroup.setIndex(this.state.bindGroups.length)
        bindGroup.createTextureBindings()
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
    this.state.bindGroups.forEach((bindGroup) => bindGroup.updateBindings())
  }

  /** TEXTURES **/

  setTextures() {
    this.textures = []
    this.texturesBindGroups = []
  }

  addTextureBinding(texture) {
    const textureBinding = {
      texture,
      matrixUniformBuffer: null,
    }

    this.textures.push(texture)

    this.texturesBindGroups.push(
      new TextureBindGroup({
        renderer: this.renderer,
        bindings: textureBinding.texture.uniformGroup.bindings,
        texture,
      })
    )
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
    if (!this.state.pipeline) return

    // update textures
    this.texturesBindGroups.forEach((textureBindGroup) => {
      const { texture } = textureBindGroup

      if (texture.shouldUpdate) {
        texture.uploadTexture(this.renderer.device)
      }

      if (texture.shouldBindGroup) {
        textureBindGroup.resetTextureBindGroup()
        texture.shouldBindGroup = false
      }
    })

    // update uniforms buffers
    this.updateBindGroups()

    // set pipeline
    pass.setPipeline(this.state.pipeline)

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
