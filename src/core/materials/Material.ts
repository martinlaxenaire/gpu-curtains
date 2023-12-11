import { isRenderer, Renderer } from '../renderers/utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Sampler } from '../samplers/Sampler'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { BufferBinding, BufferBindingInput } from '../bindings/BufferBinding'
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups'
import { Texture } from '../textures/Texture'
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'
import { Binding } from '../bindings/Binding'
import { generateUUID } from '../../utils/utils'

/**
 * Material class:
 * Used as a base to create a material.
 * The goal of material is to create and update the bind groups (including textures and samplers), create a pipeline and use them to render.
 */
export class Material {
  /** The type of the {@link Material} */
  type: string
  /** The universal unique id of the {@link Material} */
  uuid: string
  /** The {@link Renderer} used */
  renderer: Renderer
  /** Options used to create this {@link Material} */
  options: MaterialOptions

  /** Pipeline entry used by this {@link Material} */
  pipelineEntry: AllowedPipelineEntries

  /**
   * Array of [bind groups]{@link BindGroup} used by this {@link Material}
   * This array respects a specific order:
   * 1. The [main texture bind group]{@link Material#texturesBindGroup}
   * 2. The [bind group]{@link BindGroup} created using [inputs parameters]{@link MaterialParams#inputs} if any
   * 3. Additional [bind groups parameters]{@link MaterialParams#bindGroups} if any
   */
  bindGroups: AllowedBindGroups[]
  /** Array of [texture bind groups]{@link BindGroup} used by this {@link Material} */
  texturesBindGroups: TextureBindGroup[]
  /** Array of [bind groups]{@link BindGroup} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
  inputsBindGroups: BindGroup[]
  /** Array of [cloned bind groups]{@link BindGroup} created by this {@link Material} */
  clonedBindGroups: AllowedBindGroups[]

  /** Object containing all uniforms inputs handled by this {@link Material} */
  uniforms: Record<string, Record<string, BufferBindingInput>>
  /** Object containing all read only or read/write storages inputs handled by this {@link Material} */
  storages: Record<string, Record<string, BufferBindingInput>>

  /** Array of [bindings]{@link Binding} created using the [inputs parameters]{@link MaterialParams#inputs} when instancing  this {@link Material} */
  inputsBindings: BindGroupBindingElement[]

  /** Array of [textures]{@link Texture} handled by this {@link Material} */
  textures: Texture[]
  /** Array of [render textures]{@link RenderTexture} handled by this {@link Material} */
  renderTextures: RenderTexture[]
  /** Array of [samplers]{@link Sampler} handled by this {@link Material} */
  samplers: Sampler[]

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

    this.uuid = generateUUID()

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
    this.texturesBindGroups = []
    this.clonedBindGroups = []

    this.setBindGroups()

    this.setTextures()
    this.setSamplers()
  }

  /**
   * Check if all bind groups are ready, and create them if needed
   */
  compileMaterial() {
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
   * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
   */
  loseContext() {
    // start with the textures
    this.textures.forEach((texture) => {
      texture.texture = null
      texture.sourceUploaded = false
    })

    this.renderTextures.forEach((texture) => {
      texture.texture = null
    })

    // then bind groups and bindings
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) =>
      bindGroup.loseContext()
    )

    // reset pipeline as well
    this.pipelineEntry.pipeline = null
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} has been restored to recreate our bind groups.
   */
  restoreContext() {
    // start with the samplers and textures
    this.samplers.forEach((sampler) => {
      // the samplers have all been recreated by the renderer, just update the reference
      sampler.createSampler()
      sampler.binding.resource = sampler.sampler
    })

    // recreate the textures and resize them
    this.textures.forEach((texture) => {
      texture.createTexture()
      texture.resize()
    })

    this.renderTextures.forEach((texture) => {
      texture.resize(texture.size)
    })

    // now the bind groups
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.createBindGroup()
      }

      // finally re-write all our buffers
      bindGroup.bufferBindings.forEach((bufferBinding) => (bufferBinding.shouldUpdate = true))
    })
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
   * Get the main [texture bind group]{@link TextureBindGroup} created by this {@link Material} to manage all textures related bindings
   * @readonly
   */
  get texturesBindGroup(): TextureBindGroup {
    return this.texturesBindGroups[0]
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

    // then uniforms/storages inputs
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    })

    // finally, bindGroups inputs
    this.options.bindGroups?.forEach((bindGroup) => {
      // it has been created but not been added yet? add it!
      if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        bindGroup.setIndex(this.bindGroups.length)
        this.bindGroups.push(bindGroup)
      }

      // add it to our textures bind groups as well if needed
      if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        this.texturesBindGroups.push(bindGroup)

        // also add the textures?
        bindGroup.textures.forEach((texture) => {
          if (texture instanceof Texture && !this.textures.find((t) => t.uuid === texture.uuid)) {
            this.textures.push(texture)
          } else if (texture instanceof RenderTexture && !this.renderTextures.find((t) => t.uuid === texture.uuid)) {
            this.renderTextures.push(texture)
          }
        })
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
    bindGroup?: AllowedBindGroups
    bindings?: BindGroupBindingElement[]
    keepLayout?: boolean
  }): AllowedBindGroups | null {
    if (!bindGroup) return null

    const clone = bindGroup.clone({ bindings, keepLayout })
    this.clonedBindGroups.push(clone)

    return clone
  }

  /**
   * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
   * @param bindingName - the binding name/key to look for
   * @returns - bind group found or null if not found
   */
  getBindGroupByBindingName(bindingName: BufferBinding['name'] = ''): AllowedBindGroups | null {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName)
    })
  }

  /**
   * Destroy a bind group, only if it is not used by another object
   * @param bindGroup - bind group to eventually destroy
   */
  destroyBindGroup(bindGroup: AllowedBindGroups) {
    // check if this bind group is used by another object before actually destroying it
    const objectsUsingBindGroup = this.renderer.getObjectsByBindGroup(bindGroup)

    const shouldDestroy =
      !objectsUsingBindGroup || !objectsUsingBindGroup.find((object) => object.material.uuid !== this.uuid)

    if (shouldDestroy) {
      bindGroup.destroy()
    }
  }

  /**
   * Destroy all bind groups
   */
  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup))
    this.clonedBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup))
    this.texturesBindGroups = []
    this.inputsBindGroups = []
    this.bindGroups = []
    this.clonedBindGroups = []
  }

  /**
   * [Update]{@link BindGroup#update} all bind groups:
   * - Update all [textures bind groups]{@link Material#texturesBindGroups} textures
   * - Update its [buffer bindings]{@link BindGroup#bufferBindings}
   * - Check if it eventually needs a [reset]{@link BindGroup#resetBindGroup}
   * - Check if we need to flush the pipeline
   */
  updateBindGroups() {
    // now update all bind groups in use and check if they need to flush the pipeline
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.update()

      // if a bind group needs to flush the pipeline
      // usually happens if one of the bindings bindingType has changed,
      // which means the shader should be re-patched and recreated
      if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups)
        bindGroup.needsPipelineFlush = false
      }
    })
  }

  /* INPUTS */

  /**
   * Look for a binding by name/key in all bind groups
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingByName(bindingName: Binding['name'] = ''): BindGroupBindingElement | undefined {
    return this.inputsBindings.find((binding) => binding.name === bindingName)
  }

  /**
   * Force a given buffer binding update flag to update it at next render
   * @param bufferBindingName - the buffer binding name
   * @param bindingName - the binding name
   */
  shouldUpdateInputsBindings(bufferBindingName?: BufferBinding['name'], bindingName?: BufferBindingInput['name']) {
    if (!bufferBindingName) return

    const bufferBinding = this.getBindingByName(bufferBindingName)
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

  /* SAMPLERS & TEXTURES */

  /**
   * Prepare our textures array and set the {@see TextureBindGroup}
   */
  setTextures() {
    this.textures = []
    this.renderTextures = []
    this.texturesBindGroups.push(
      new TextureBindGroup(this.renderer, {
        label: this.options.label + ': Textures bind group',
      })
    )
  }

  /**
   * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
   * @param texture - texture to add
   */
  addTexture(texture: Texture | RenderTexture) {
    if (texture instanceof Texture) {
      this.textures.push(texture)
    } else if (texture instanceof RenderTexture) {
      this.renderTextures.push(texture)
    }

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
   * Destroy a [texture]{@link Texture} or [render texture]{@link RenderTexture}, only if it is not used by another object
   * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to eventually destroy
   */
  destroyTexture(texture: Texture | RenderTexture) {
    // check if this texture is used by another object before actually destroying it
    const objectsUsingTexture = this.renderer.getObjectsByTexture(texture)

    const shouldDestroy =
      !objectsUsingTexture || !objectsUsingTexture.find((object) => object.material.uuid !== this.uuid)

    if (shouldDestroy) {
      texture.destroy()
    }
  }

  /**
   * Destroy all the Material textures
   */
  destroyTextures() {
    this.textures?.forEach((texture) => this.destroyTexture(texture))
    this.renderTextures?.forEach((texture) => this.destroyTexture(texture))
    this.textures = []
    this.renderTextures = []
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
   * Then render the [textures]{@link Material#textures}
   * Finally updates all the [bind groups]{@link Material#bindGroups}
   */
  onBeforeRender() {
    // set our material if needed
    this.compileMaterial()

    // first what needs to be done for all textures
    this.textures.forEach((texture) => {
      texture.render()
    })

    // update bind groups
    this.updateBindGroups()
  }

  /**
   * Set the current pipeline
   * @param pass - current pass encoder
   */
  setPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder) {
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry)
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
    this.setPipeline(pass)

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
