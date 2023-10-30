import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { toKebabCase } from '../../utils/utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Sampler } from '../samplers/Sampler'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import {
  AllowedBindGroups,
  BindGroupBindingBuffer,
  BindGroupBindingElement,
  BindGroupBufferBindingElement,
} from '../../types/BindGroups'
import { Texture } from '../textures/Texture'
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture } from '../../types/core/materials/Material'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'

export class Material {
  type: string
  renderer: Renderer
  options: MaterialOptions

  pipelineEntry: AllowedPipelineEntries

  bindGroups: AllowedBindGroups[]
  clonedBindGroups: AllowedBindGroups[]

  uniforms: Record<string, Record<string, BufferBindingsUniform>>
  storages: Record<string, Record<string, BufferBindingsUniform>>
  works: Record<string, Record<string, BufferBindingsUniform>>

  inputsBindGroups: BindGroup[]
  inputsBindings: BindGroupBindingElement[]

  textures: MaterialTexture[]
  samplers: Sampler[]
  texturesBindGroup: TextureBindGroup

  constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, this.type)

    this.renderer = renderer

    const { shaders, label, useAsyncPipeline, inputs, inputBindGroups, samplers } = parameters

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

    this.options = {
      shaders,
      label,
      ...(useAsyncPipeline !== undefined && { useAsyncPipeline }),
      ...(inputs !== undefined && { inputs }),
      ...(inputBindGroups !== undefined && { inputBindGroups }),
      ...(samplers !== undefined && { samplers }),
    }

    this.bindGroups = []
    this.clonedBindGroups = []

    this.setBindGroups()

    this.setTextures()
    this.setSamplers()
  }

  setMaterial() {
    const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0
    const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength

    // TODO cache bind groups and pipelines?
    // https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change
    if (!bindGroupsReady) {
      this.createBindGroups()
    }
  }

  get ready(): boolean {
    return !!(this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  getShaderCode(shaderType: FullShadersType = 'full'): string {
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

  getAddedShaderCode(shaderType: FullShadersType = 'vertex'): string {
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

  setBindGroups() {
    this.uniforms = {}
    this.storages = {}
    this.works = {}

    this.inputsBindGroups = []
    this.inputsBindings = []

    if (this.options.inputs) {
      const inputsBindGroup = new BindGroup(this.renderer, {
        label: this.options.label + ': Bindings bind group',
        inputs: this.options.inputs,
      })

      this.processBindGroupBindings(inputsBindGroup)
      this.inputsBindGroups.push(inputsBindGroup)
    }

    this.options.inputBindGroups?.forEach((bindGroup) => {
      this.processBindGroupBindings(bindGroup)
      this.inputsBindGroups.push(bindGroup)
    })
  }

  processBindGroupBindings(bindGroup: BindGroup) {
    bindGroup.bindings.forEach((inputBinding) => {
      if (inputBinding.bindingType === 'uniform')
        this.uniforms = {
          ...this.uniforms,
          [inputBinding.name]: (inputBinding as BindGroupBufferBindingElement).bindings,
        }
      if (inputBinding.bindingType === 'storage')
        this.storages = {
          ...this.storages,
          [inputBinding.name]: (inputBinding as BindGroupBufferBindingElement).bindings,
        }
      if (inputBinding.bindingType === 'storageWrite')
        this.works = { ...this.works, [inputBinding.name]: (inputBinding as BindGroupBufferBindingElement).bindings }

      // inputBinding.isActive =
      //   (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(inputBinding.name + '.') !== -1) ||
      //   (this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(inputBinding.name + '.') !== -1) ||
      //   (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(inputBinding.name + '.') !== -1)

      this.inputsBindings.push(inputBinding)
    })
  }

  createBindGroups() {
    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length)
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    this.options.inputBindGroups?.forEach((bindGroup) => {
      // it has been created but not been added yet? add it!
      if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
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

  cloneBindGroup({
    bindGroup,
    bindingsBuffers = [],
    keepLayout = true,
  }: {
    bindGroup?: BindGroup
    bindingsBuffers?: BindGroupBindingBuffer[]
    keepLayout?: boolean
  }): BindGroup | null {
    if (!bindGroup) return null

    const clone = bindGroup.cloneFromBindingsBuffers({ bindingsBuffers, keepLayout })
    this.clonedBindGroups.push(clone)

    return clone
  }

  getBindGroupByBindingName(bindingName: BufferBindings['name'] = ''): AllowedBindGroups | null {
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

  shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], bindingName?: BufferBindingsUniform['name']) {
    if (!bufferBindingName) return

    const bufferBinding = this.inputsBindings.find((bB) => bB.name === bufferBindingName)
    if (bufferBinding) {
      if (!bindingName) {
        Object.keys((bufferBinding as BindGroupBufferBindingElement).bindings).forEach((bindingKey) =>
          (bufferBinding as BindGroupBufferBindingElement).shouldUpdateBinding(bindingKey)
        )
      } else {
        ;(bufferBinding as BindGroupBufferBindingElement).shouldUpdateBinding(bindingName)
      }
    }
  }

  getBindingsByName(bindingName: BufferBindings['name'] = ''): BufferBindings | null {
    let binding
    ;(this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
      binding = bindGroup.getBindingsByName(bindingName)
    })

    return binding
  }

  getBindingsBuffersByBindingName(bindingName: BufferBindings['name'] = ''): BindGroupBindingBuffer[] {
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

  /** SAMPLERS & TEXTURES **/

  setTextures() {
    this.textures = []
    this.texturesBindGroup = new TextureBindGroup(this.renderer, {
      label: this.options.label + ': Textures bind group',
    })
  }

  addTexture(texture: Texture | RenderTexture) {
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

  setSamplers() {
    this.samplers = []

    this.options.samplers?.forEach((sampler) => {
      this.addSampler(sampler)
    })

    // create our default sampler if needed
    const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === 'defaultSampler')
    if (!hasDefaultSampler) {
      const sampler = new Sampler(this.renderer, { name: 'defaultSampler' })
      this.addSampler(sampler)
    }
  }

  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)

    // is it used in our shaders?
    if (
      (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(sampler.name) !== -1) ||
      (this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(sampler.name) !== -1) ||
      (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1)
    ) {
      this.texturesBindGroup.addSampler(sampler)
    }
  }

  /** Render loop **/

  onBeforeRender() {
    // set our material if needed
    this.setMaterial()

    // first what needs to be done for all textures
    this.textures.forEach((texture) => {
      // RenderTextures does not have a render method
      if ('render' in texture) {
        texture.render()
      }
    })

    // then what needs to be done only for textures actually used in our shaders
    this.texturesBindGroup?.textures.forEach((texture, textureIndex) => {
      // copy textures that need it on first init, but only when original texture is ready
      if (texture instanceof Texture) {
        if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
          texture.copy(texture.options.fromTexture)
        }

        if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === 'externalVideo') {
          texture.uploadVideoTexture()

          if (this.texturesBindGroup.shouldUpdateVideoTextureBindGroupLayout(textureIndex)) {
            this.texturesBindGroup.updateVideoTextureBindGroupLayout(textureIndex)
          }
        }
      }

      // reset texture bind group each time the texture changed:
      // 1. texture media is loaded (switch from placeholder 1x1 texture to media texture)
      // 2. external texture at each tick
      // 3. render texture has changed (on resize)
      if (texture.shouldUpdateBindGroup && (texture.texture || (texture as Texture).externalTexture)) {
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
  render(pass: GPURenderPassEncoder | GPUComputePassEncoder) {
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
