import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Sampler } from '../samplers/Sampler'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { BufferBindings, BufferBindingsInput } from '../bindings/BufferBindings'
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups'
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
  /** The type of the {@link Material} */
  type: string
  /** The {@link Renderer} used */
  renderer: Renderer
  /** Options used to create this {@link Material} */
  options: MaterialOptions

  /** Pipeline entry used by this {@link Material} */
  pipelineEntry: AllowedPipelineEntries

  /** Array of [bind groups]{@link BindGroup} used by this {@link Material} */
  bindGroups: AllowedBindGroups[]
  /** Array of [cloned bind groups]{@link BindGroup} created by this {@link Material} */
  clonedBindGroups: AllowedBindGroups[]

  /** Object containing all uniforms inputs handled by this {@link Material} */
  uniforms: Record<string, Record<string, BufferBindingsInput>>
  /** Object containing all readonly storages inputs handled by this {@link Material} */
  storages: Record<string, Record<string, BufferBindingsInput>>
  /** Object containing all read/write storages inputs handled by this {@link Material} */
  works: Record<string, Record<string, BufferBindingsInput>>

  /** Array of [bind groups]{@link BindGroup} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
  inputsBindGroups: BindGroup[]
  /** Array of [bindings]{@link Bindings} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
  inputsBindings: BindGroupBindingElement[]

  /** Array of [textures]{@link MaterialTexture} handled by this {@link Material} */
  textures: MaterialTexture[]
  /** Array of [samplers]{@link Sampler} handled by this {@link Material} */
  samplers: Sampler[]
  /** Specific [texture bind group]{@link TextureBindGroup} created by this {@link Material} to manage all textures related bindings */
  texturesBindGroup: TextureBindGroup

  /**
   * Material constructor
   * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
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
   * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled
   * @readonly
   */
  get ready(): boolean {
    return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="full"] - shader to get the code from
   * @returns - The corresponding shader code
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
   * @param [shaderType="full"] - shader to get the code from
   * @returns - The corresponding shader code
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

  /* BIND GROUPS */

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
   * @param bindGroup - The {@see BindGroup} to process
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
   * @param bindGroup - the BindGroup to clone
   * @param bindings - our input binding buffers
   * @param keepLayout - whether we should keep original bind group layout or not
   * @returns - the cloned BindGroup
   */
  cloneBindGroup({
    bindGroup,
    bindings = [],
    keepLayout = true,
  }: {
    bindGroup?: BindGroup
    bindings?: BindGroupBindingElement[]
    keepLayout?: boolean
  }): BindGroup | null {
    if (!bindGroup) return null

    const clone = bindGroup.cloneFromBindings({ bindings, keepLayout })
    this.clonedBindGroups.push(clone)

    return clone
  }

  /**
   * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
   * @param bindingName - the binding name/key to look for
   * @returns - bind group found or null if not found
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

  /* INPUTS */

  /**
   * Force a given buffer binding update flag to update it at next render
   * @param bufferBindingName - the buffer binding name
   * @param bindingName - the binding name
   */
  shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], bindingName?: BufferBindingsInput['name']) {
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
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingsByName(bindingName: BufferBindings['name'] = ''): BindGroupBindingElement | null {
    let binding
    ;(this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
      binding = bindGroup.getBindingsByName(bindingName)
    })

    return binding
  }

  /* SAMPLERS & TEXTURES */

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
   * @param texture - texture to add
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
   * @param sampler - sampler to add
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

  /* RENDER */

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
   * @param pass - current pass encoder
   */
  render(pass: GPURenderPassEncoder | GPUComputePassEncoder) {
    // renderer or pipeline are not ready yet
    // not really needed since meshes/compute passes do already check it beforehand
    // mostly here as a safeguard
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
