import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { isRenderer } from '../../utils/renderer-utils'
import { toKebabCase } from '../../utils/utils'
import { BufferBindings } from '../bindings/BufferBindings'

export class Material {
  constructor(renderer, parameters) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

    this.renderer = renderer

    let { shaders, label, uniforms, storages, inputBindGroups } = parameters

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

    if (!uniforms) uniforms = {}
    if (!storages) storages = {}
    if (!inputBindGroups) inputBindGroups = []

    this.options = {
      shaders,
      label,
      uniforms,
      storages,
      inputBindGroups,
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

    this.options.inputBindGroups.forEach((bindGroup) => {
      // it has not been added yet? add it!
      if (!bindGroup.shouldCreateBindGroup) {
        this.bindGroups.push(bindGroup)
      }
    })

    // then uniforms
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })
  }

  cloneBindGroup({ bindGroup, bindingsBuffers = [], keepLayout = true }) {
    if (!bindGroup) return null

    const clone = bindGroup.cloneFromBindingsBuffers({ bindingsBuffers, keepLayout })
    this.clonedBindGroups.push(clone)

    return clone
  }

  getBindGroupByBindingName(bindingName = '') {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName)
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

  /** INPUTS **/

  createInputBindings(bindingType = 'uniform', inputs = {}) {
    const inputBindings = [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey]

        const bindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          useStruct: true,
          bindings: binding.bindings,
          visibility: binding.visibility,
        }

        return binding.useStruct !== false
          ? new BufferBindings(bindingParams)
          : Object.keys(binding.bindings).map((bindingKey) => {
              bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey)
              bindingParams.name = inputKey + bindingKey
              bindingParams.useStruct = false
              bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

              return new BufferBindings(bindingParams)
            })
      }),
    ].flat()

    return inputBindings
  }

  setInputBindings() {
    this.inputsBindings = [
      ...this.createInputBindings('uniform', this.options.uniforms),
      ...this.createInputBindings('storage', this.options.storages),
    ]
  }

  setBindings() {
    this.uniforms = {}
    this.storages = {}

    this.setInputBindings()

    this.inputsBindGroups = []

    if (this.inputsBindings.length) {
      const inputsBindGroup = new BindGroup({
        label: this.options.label + ': Bindings bind group',
        renderer: this.renderer,
      })

      this.inputsBindings.forEach((inputBinding) => {
        if (inputBinding.bindingType === 'uniform')
          this.uniforms = { ...this.uniforms, [inputBinding.name]: inputBinding.bindings }
        if (inputBinding.bindingType === 'storage')
          this.storages = { ...this.storages, [inputBinding.name]: inputBinding.bindings }

        inputBinding.isActive =
          (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(inputBinding.name + '.') !== -1) ||
          (this.options.shaders.fragment &&
            this.options.shaders.fragment.code.indexOf(inputBinding.name + '.') !== -1) ||
          (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(inputBinding.name + '.') !== -1)

        inputsBindGroup.addBinding(inputBinding)
      })

      this.inputsBindGroups.push(inputsBindGroup)
    }

    this.options.inputBindGroups.forEach((bindGroup) => {
      // TODO uniforms + inputsbindings
      this.inputsBindGroups.push(bindGroup)

      bindGroup.bindings.forEach((inputBinding) => {
        if (inputBinding.bindingType === 'uniform')
          this.uniforms = { ...this.uniforms, [inputBinding.name]: inputBinding.bindings }
        if (inputBinding.bindingType === 'storage')
          this.storages = { ...this.storages, [inputBinding.name]: inputBinding.bindings }
        if (inputBinding.bindingType === 'storageWrite')
          this.works = { ...this.works, [inputBinding.name]: inputBinding.bindings }
      })
    })
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

  getBindingsByName(bindingName = '') {
    let binding
    ;(this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
      binding = bindGroup.bindings.find((binding) => binding.name === bindingName)
    })

    return binding
  }

  getBindingsBuffersByBindingName(bindingName = '') {
    let bindings = []
    ;(this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
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
      (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1) ||
      (this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1) ||
      (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1)
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
