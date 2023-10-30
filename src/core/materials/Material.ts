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
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'

/**
 * Material class:
 * Used as a base to create a material.
 * The goal of material is to create and update the bind groups (including textures and samplers), create a pipeline and use them to render.
 */
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

  /**
   * Material constructor
   * @param {Renderer | GPUCurtains} renderer - our renderer class object
   * @param {MaterialParams} parameters - parameters used to create our Material
   * @param {string} parameters.label - Material label
   * @param {boolean} parameters.useAsyncPipeline - whether the pipeline should be compiled asynchronously
   * @param {MaterialShaders} parameters.shaders - our Material shader codes and entry points
   * @param {BindGroupInputs} parameters.inputs - our Material {@see BindGroup} inputs
   * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
   * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, this.type)

    this.renderer = renderer

    const { shaders, label, useAsyncPipeline, inputs, bindGroups, samplers } = parameters

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
      ...(bindGroups !== undefined && { bindGroups }),
      ...(samplers !== undefined && { samplers }),
    }

    this.bindGroups = []
    this.clonedBindGroups = []

    this.setBindGroups()

    this.setTextures()
    this.setSamplers()
  }

  /**
   * Check if all bind groups are ready, and create them if needed
   */
  setMaterial() {
    const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0
    const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength

    // TODO cache bind groups and pipelines?
    // https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change
    if (!bindGroupsReady) {
      this.createBindGroups()
    }
  }

  /**
   * Get whether our pipeline entry and pipeline have been created and successfully compiled
   * @readonly
   * @type {boolean}
   */
  get ready(): boolean {
    return !!(this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
   * @param {FullShadersType} [shaderType="full"] - shader to get the code from
   * @returns {string} - The corresponding shader code
   */
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

  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
   * @param {FullShadersType} [shaderType="full"] - shader to get the code from
   * @returns {string} - The corresponding shader code
   */
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

  /**
   * Prepare and set our bind groups based on inputs and bindGroups Material parameters
   */
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

    this.options.bindGroups?.forEach((bindGroup) => {
      this.processBindGroupBindings(bindGroup)
      this.inputsBindGroups.push(bindGroup)
    })
  }

  /**
   * Process all {@see BindGroup} bindings and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to bindings.
   * @param {BindGroup} bindGroup
   */
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

  /**
   * Create the bind groups if they need to be created
   */
  createBindGroups() {
    // textures first
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length)
      this.texturesBindGroup.createBindGroup()

      this.bindGroups.push(this.texturesBindGroup)
    }

    this.options.bindGroups?.forEach((bindGroup) => {
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

  /**
   * Clones a {@see BindGroup} from a list of buffers
   * Useful to create a new bind group with already created buffers, but swapped
   * @param {BindGroup} bindGroup - the BindGroup to clone
   * @param {BindGroupBindingBuffer[]} bindingsBuffers - our input binding buffers
   * @param {boolean} keepLayout - whether we should keep original bind group layout or not
   * @returns {AllowedBindGroups} - the cloned BindGroup
   */
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

  /**
   * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
   * @param {BufferBindings['name']=} bindingName - the binding name/key to look for
   * @returns {?AllowedBindGroups} - bind group found or null if not found
   */
  getBindGroupByBindingName(bindingName: BufferBindings['name'] = ''): AllowedBindGroups | null {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName)
    })
  }

  /**
   * Destroy all bind groups
   */
  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.clonedBindGroups.forEach((bindGroup) => bindGroup.destroy())
    this.texturesBindGroup = null
    this.inputsBindGroups = []
    this.bindGroups = []
    this.clonedBindGroups = []
  }

  /**
   * Update all bind groups.
   * For each of them, first check if it eventually needs a reset, then update its bindings
   */
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

  /**
   * Force a given buffer binding update flag to update it at next render
   * @param {BufferBindings['name']=} bufferBindingName - the buffer binding name
   * @param {BufferBindingsUniform['name']=} bindingName - the binding name
   */
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

  /**
   * Look for a binding by name/key in all bind groups
   * @param {string} bindingName - the binding name or key
   * @returns {BindGroupBindingElement | null} - the found binding, or null if not found
   */
  getBindingsByName(bindingName: BufferBindings['name'] = ''): BindGroupBindingElement | null {
    let binding
    ;(this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
      binding = bindGroup.getBindingsByName(bindingName)
    })

    return binding
  }

  /**
   * Look for a binding buffer by name/key in all bind groups
   * @param {string} bindingName - the binding name or key
   * @returns {BindGroupBindingBuffer[]} - the found binding buffers, or an empty array if not found
   */
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

  /**
   * Prepare our textures array and set the {@see TextureBindGroup}
   */
  setTextures() {
    this.textures = []
    this.texturesBindGroup = new TextureBindGroup(this.renderer, {
      label: this.options.label + ': Textures bind group',
    })
  }

  /**
   * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
   * @param {Texture | RenderTexture} texture - texture to add
   */
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

  /**
   * Destroy all the Material textures
   */
  destroyTextures() {
    this.textures?.forEach((texture) => texture.destroy())
    this.textures = []
  }

  /**
   * Prepare our samplers array and always add a default sampler if not already passed as parameter
   */
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

  /**
   * Add a sampler to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
   * @param {Sampler} sampler - sampler to add
   */
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

  /**
   * Called before rendering the Material.
   * First, check if we need to create our bind groups or pipeline
   * Then render the textures and updates them
   * Finally updates all buffer inputs that need it and update the bind groups (write buffers if needed)
   */
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
   * Render the material if it is ready:
   * Set the current pipeline and set the bind groups
   * @param {GPURenderPassEncoder | GPUComputePassEncoder} pass
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

  /**
   * Destroy the Material
   */
  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyBindGroups()
    this.destroyTextures()
  }
}
