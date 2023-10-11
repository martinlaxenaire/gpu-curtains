import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { isRenderer } from '../../utils/renderer-utils'
import { toKebabCase } from '../../utils/utils'

export class Material {
  constructor(renderer, parameters) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

    this.renderer = renderer

    let { shaders, label, uniforms, storages } = parameters

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

    // if (!shaders.vertex.entryPoint) {
    //   shaders.vertex.entryPoint = 'main'
    // }
    //
    // if (!shaders.fragment.entryPoint) {
    //   shaders.fragment.entryPoint = 'main'
    // }

    if (!uniforms) uniforms = []
    if (!storages) storages = []

    this.options = {
      shaders,
      label,
      uniforms,
      storages,
    }

    this.bindGroups = []
    this.clonedBindGroups = []

    this.setBindings()
    this.setTextures()
  }

  setMaterial() {
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
        case 'compute':
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
        case 'compute':
          return shaderType
        default:
          return 'vertex'
      }
    })()

    return this.pipelineEntry.shaders[shaderType].head
  }

  /** BIND GROUPS **/

  createBindGroups() {
    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length) // bindGroup 0 is our renderer camera
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    // then uniforms
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }

  cloneBindGroupAtIndex(index = 0) {
    const originalBindGroup = this.bindGroups.find((bindGroup) => bindGroup.index === index)
    if (originalBindGroup) {
      const clone = originalBindGroup.clone()
      this.clonedBindGroups.push(clone)
      return clone
    } else {
      return null
    }
  }

  // swapBindGroups(firstBindGroup, secondBindGroup) {
  //
  // }

  swapBindGroupsAtIndex(index = 0) {
    const originalBindGroupIndex = this.bindGroups.findIndex((bindGroup) => bindGroup.index === index)
    const clonedBindGroupIndex = this.clonedBindGroups.findIndex((bindGroup) => bindGroup.index === index)

    const originalBindGroup = originalBindGroupIndex !== -1 ? this.bindGroups[originalBindGroupIndex] : null
    const clonedBindGroup = clonedBindGroupIndex !== -1 ? this.clonedBindGroups[clonedBindGroupIndex] : null

    if (originalBindGroup && clonedBindGroup && originalBindGroup.type === clonedBindGroup.type) {
      // swap
      ;[this.bindGroups[originalBindGroupIndex], this.clonedBindGroups[clonedBindGroupIndex]] = [
        this.clonedBindGroups[clonedBindGroupIndex],
        this.bindGroups[originalBindGroupIndex],
      ]
    }
  }

  getBindingsBuffersByBindingName(bindingName = '') {
    let bindings = []
    this.bindGroups.forEach((bindGroup) => {
      const binding = bindGroup.bindingsBuffers.filter((bindingBuffer) =>
        bindingBuffer.inputBinding.useStruct
          ? bindingBuffer.inputBinding.name === bindingName
          : bindingBuffer.inputBinding.name ===
            bindingName +
              toKebabCase(
                bindingBuffer.inputBinding.bindingElements.length
                  ? bindingBuffer.inputBinding.bindingElements[0].name
                  : ''
              )
      )

      if (binding.length) {
        bindings = [...bindings, ...binding]
      }
    })

    return bindings
  }

  swapBindingsBuffers(firstBindings = [], secondBindings = []) {
    firstBindings.forEach((firstBinding, index) => {
      let secondBinding = secondBindings[index]
      if (secondBinding) {
        console.log(firstBinding, secondBinding)
        const temp = firstBinding
        firstBinding = secondBinding
        secondBinding = temp

        console.log(secondBinding.inputBinding.name, '->', firstBinding.inputBinding.name)
      }
    })
  }

  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.clonedBindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.texturesBindGroup = null
    this.inputsBindGroups = []
    this.bindGroups = []
    this.clonedBindGroups = []
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

  setBindings() {
    this.uniforms = {}
    this.storages = {}
    this.inputsBindings = [...this.options.uniforms, ...this.options.storages]
    this.inputsBindGroups = []

    if (this.options.uniforms.length || this.options.storages.length) {
      const inputsBindGroup = new BindGroup({
        label: this.options.label + ': Bindings bind group',
        renderer: this.renderer,
      })

      this.inputsBindings.forEach((inputBinding) => {
        if (inputBinding.bindingType === 'uniform') this.uniforms = { ...this.uniforms, ...inputBinding.bindings }
        if (inputBinding.bindingType === 'storage') this.storages = { ...this.storages, ...inputBinding.bindings }

        inputBinding.isActive =
          (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(inputBinding.name + '.') !== -1) ||
          (this.options.shaders.fragment &&
            this.options.shaders.fragment.code.indexOf(inputBinding.name + '.') !== -1) ||
          (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(inputBinding.name + '.') !== -1)

        inputsBindGroup.addBinding(inputBinding)
      })

      this.inputsBindGroups.push(inputsBindGroup)
    }
  }

  shouldUpdateInputsBindings(bufferBindingName, uniformName) {
    if (!bufferBindingName) return

    const bufferBinding = this.inputsBindings.find((bB) => bB.name === bufferBindingName)
    if (bufferBinding) {
      if (!uniformName) {
        Object.keys(bufferBinding.bindings).forEach((uniformKey) => bufferBinding.shouldUpdateBinding(uniformKey))
      } else {
        bufferBinding.shouldUpdateBinding(uniformName)
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

    this.inputsBindings.forEach((inputBinding) => {
      inputBinding.onBeforeRender()
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
  }

  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyBindGroups()
    this.destroyTextures()
  }
}
