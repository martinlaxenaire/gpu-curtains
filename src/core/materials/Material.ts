import { isRenderer, Renderer } from '../renderers/utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Sampler } from '../samplers/Sampler'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { BufferBinding, BufferBindingInput } from '../bindings/BufferBinding'
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups'
import { Texture } from '../textures/Texture'
import { FullShadersType, MaterialOptions, MaterialParams, ShaderOptions } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture } from '../textures/RenderTexture'
import { Binding } from '../bindings/Binding'
import { generateUUID } from '../../utils/utils'
import { BufferElement } from '../bindings/bufferElements/BufferElement'

/**
 * Used as a base to create a {@link Material}.<br>
 * The purpose of {@link Material} is to create and update the {@link BindGroup | bind groups} and their bindings (GPU buffers, textures and samplers), create a {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} and use them to {@link Material#render | render}.
 *
 * ## Bind groups
 *
 * A {@link Material} automatically creates a {@link TextureBindGroup}, but it is actually added to the active {@link Material#bindGroups | bind groups array} only if necessary, which means if your shaders use a {@link GPUSampler}, a {@link GPUTexture} or a {@link GPUExternalTexture}.
 *
 * Another {@link BindGroup} will be created if you pass any {@link MaterialParams#uniforms | uniforms} or {@link MaterialParams#storages | storages} parameters.
 *
 * Finally, you can also pass already created {@link BindGroup} to a {@link Material} via the {@link MaterialParams#bindGroups | bindGroups} parameter.
 *
 * ----
 *
 * Note that this class is not intended to be used as is, but as a base for {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} and {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} classes.
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
   * Array of {@link BindGroup | bind groups} used by this {@link Material}
   * This array respects a specific order:
   * 1. The {@link texturesBindGroup | textures bind groups}
   * 2. The {@link BindGroup | bind group} created using {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters if any
   * 3. Additional {@link MaterialParams#bindGroups | bind groups} parameters if any
   */
  bindGroups: AllowedBindGroups[]
  /** Array of {@link TextureBindGroup | texture bind groups} used by this {@link Material} */
  texturesBindGroups: TextureBindGroup[]
  /** Array of {@link BindGroup | bind groups} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material} */
  inputsBindGroups: BindGroup[]
  /** Array of {@link BindGroup | cloned bind groups} created by this {@link Material} */
  clonedBindGroups: AllowedBindGroups[]

  /** Object containing all uniforms inputs handled by this {@link Material} */
  uniforms: Record<string, Record<string, BufferBindingInput>>
  /** Object containing all read only or read/write storages inputs handled by this {@link Material} */
  storages: Record<string, Record<string, BufferBindingInput>>

  /** Array of {@link Binding | bindings} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material} */
  inputsBindings: BindGroupBindingElement[]

  /** Array of {@link Texture} handled by this {@link Material} */
  textures: Texture[]
  /** Array of {@link RenderTexture} handled by this {@link Material} */
  renderTextures: RenderTexture[]
  /** Array of {@link Sampler} handled by this {@link Material} */
  samplers: Sampler[]

  /**
   * Material constructor
   * @param renderer - our renderer class object
   * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams) {
    this.type = 'Material'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    const {
      shaders,
      label,
      useAsyncPipeline,
      uniforms,
      storages,
      bindings,
      bindGroups,
      samplers,
      textures,
      renderTextures,
    } = parameters

    this.options = {
      shaders,
      label,
      useAsyncPipeline: useAsyncPipeline === undefined ? true : useAsyncPipeline,
      ...(uniforms !== undefined && { uniforms }),
      ...(storages !== undefined && { storages }),
      ...(bindings !== undefined && { bindings }),
      ...(bindGroups !== undefined && { bindGroups }),
      ...(samplers !== undefined && { samplers }),
      ...(textures !== undefined && { textures }),
      ...(renderTextures !== undefined && { renderTextures }),
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
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
   */
  loseContext() {
    // start with the textures
    for (const texture of this.textures) {
      texture.texture = null
      texture.sourceUploaded = false
    }

    for (const texture of this.renderTextures) {
      texture.texture = null
    }

    // then bind groups and struct
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) =>
      bindGroup.loseContext()
    )

    // reset pipeline as well
    this.pipelineEntry.pipeline = null
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our bind groups.
   */
  restoreContext() {
    // start with the samplers and textures
    for (const sampler of this.samplers) {
      // the samplers have all been recreated by the renderer, just update the reference
      sampler.createSampler()
      sampler.binding.resource = sampler.sampler
    }

    // recreate the textures and resize them
    for (const texture of this.textures) {
      texture.createTexture()
      texture.resize()
    }

    for (const texture of this.renderTextures) {
      texture.resize(texture.size)
    }

    // now the bind groups
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.createBindGroup()
      }

      // finally re-write all our buffers
      for (const bufferBinding of bindGroup.bufferBindings) {
        bufferBinding.shouldUpdate = true
      }
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
   * @param [shaderType="vertex"] - shader to get the code from
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

    if (this.options.uniforms || this.options.storages || this.options.bindings) {
      const inputsBindGroup = new BindGroup(this.renderer, {
        label: this.options.label + ': Bindings bind group',
        uniforms: this.options.uniforms,
        storages: this.options.storages,
        bindings: this.options.bindings,
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
   * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct
   * @readonly
   */
  get texturesBindGroup(): TextureBindGroup {
    return this.texturesBindGroups[0]
  }

  /**
   * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
   * @param bindGroup - The {@link BindGroup} to process
   */
  processBindGroupBindings(bindGroup: BindGroup) {
    for (const inputBinding of bindGroup.bindings) {
      if (inputBinding.bindingType === 'uniform')
        this.uniforms = {
          ...this.uniforms,
          [inputBinding.name]: (inputBinding as BindGroupBufferBindingElement).inputs,
        }
      if (inputBinding.bindingType === 'storage')
        this.storages = {
          ...this.storages,
          [inputBinding.name]: (inputBinding as BindGroupBufferBindingElement).inputs,
        }

      this.inputsBindings.push(inputBinding)
    }
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
    for (const bindGroup of this.inputsBindGroups) {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length)
        bindGroup.createBindGroup()

        this.bindGroups.push(bindGroup)
      }
    }

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
        for (const texture of bindGroup.textures) {
          if (texture instanceof Texture && !this.textures.find((t) => t.uuid === texture.uuid)) {
            this.textures.push(texture)
          } else if (texture instanceof RenderTexture && !this.renderTextures.find((t) => t.uuid === texture.uuid)) {
            this.renderTextures.push(texture)
          }
        }
      }
    })
  }

  /**
   * Clones a {@link BindGroup} from a list of buffers
   * Useful to create a new bind group with already created buffers, but swapped
   * @param parameters - parameters used to clone the {@link BindGroup | bind group}
   * @param parameters.bindGroup - the BindGroup to clone
   * @param parameters.bindings - our input binding buffers
   * @param parameters.keepLayout - whether we should keep original bind group layout or not
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
   * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
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
    this.texturesBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup))
    this.texturesBindGroups = []
    this.inputsBindGroups = []
    this.bindGroups = []
    this.clonedBindGroups = []
  }

  /**
   * {@link BindGroup#update | Update} all bind groups:
   * - Update all {@link texturesBindGroups | textures bind groups} textures
   * - Update its {@link BindGroup#bufferBindings | buffer bindings}
   * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}
   * - Check if we need to flush the pipeline
   */
  updateBindGroups() {
    // now update all bind groups in use and check if they need to flush the pipeline
    for (const bindGroup of this.bindGroups) {
      bindGroup.update()

      // if a bind group needs to flush the pipeline
      // usually happens if one of the struct bindingType has changed,
      // which means the shader should be re-patched and recreated
      if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups)
        bindGroup.needsPipelineFlush = false
      }
    }
  }

  /* INPUTS */

  /**
   * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingByName(bindingName: Binding['name'] = ''): BindGroupBindingElement | undefined {
    return this.inputsBindings.find((binding) => binding.name === bindingName)
  }

  /**
   * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBufferBindingByName(bindingName: Binding['name'] = ''): BindGroupBufferBindingElement | undefined {
    return this.inputsBindings.find((binding) => binding.name === bindingName && 'buffer' in binding) as
      | BindGroupBufferBindingElement
      | undefined
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
        Object.keys((bufferBinding as BindGroupBufferBindingElement).inputs).forEach((bindingKey) =>
          (bufferBinding as BindGroupBufferBindingElement).shouldUpdateBinding(bindingKey)
        )
      } else {
        ;(bufferBinding as BindGroupBufferBindingElement).shouldUpdateBinding(bindingName)
      }
    }
  }

  /* SAMPLERS & TEXTURES */

  /**
   * Prepare our textures array and set the {@link TextureBindGroup}
   */
  setTextures() {
    this.textures = []
    this.renderTextures = []
    this.texturesBindGroups.push(
      new TextureBindGroup(this.renderer, {
        label: this.options.label + ': Textures bind group',
      })
    )

    this.options.textures?.forEach((texture) => {
      this.addTexture(texture)
    })

    this.options.renderTextures?.forEach((texture) => {
      this.addTexture(texture)
    })
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
      (this.options.shaders.fragment &&
        (this.options.shaders.fragment as ShaderOptions).code.indexOf(texture.options.name) !== -1) ||
      (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1)
    ) {
      this.texturesBindGroup.addTexture(texture)
    }
  }

  /**
   * Destroy a {@link Texture} or {@link RenderTexture}, only if it is not used by another object or cached.
   * @param texture - {@link Texture} or {@link RenderTexture} to eventually destroy
   */
  destroyTexture(texture: Texture | RenderTexture) {
    // do not destroy a texture that must stay in cache
    if ((texture as Texture).options.cache) return

    // check if this texture is used by another object before actually destroying it
    const objectsUsingTexture = this.renderer.getObjectsByTexture(texture)

    const shouldDestroy =
      !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid)

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
      (this.options.shaders.fragment &&
        (this.options.shaders.fragment as ShaderOptions).code.indexOf(sampler.name) !== -1) ||
      (this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1)
    ) {
      this.texturesBindGroup.addSampler(sampler)
    }
  }

  /* BUFFER RESULTS */

  /**
   * Map a {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}
   * @param buffer - {@link GPUBuffer} to map
   * @async
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
   */
  async getBufferResult(buffer: GPUBuffer): Promise<Float32Array> {
    await buffer.mapAsync(GPUMapMode.READ)
    const result = new Float32Array(buffer.getMappedRange().slice(0))
    buffer.unmap()

    return result
  }

  /**
   * Map the content of a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
   * @async
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
   */
  async getBufferBindingResultByBindingName(bindingName: Binding['name'] = ''): Promise<Float32Array> {
    const binding = this.getBufferBindingByName(bindingName)
    if (binding && 'buffer' in binding) {
      const dstBuffer = this.renderer.copyBufferToBuffer({
        srcBuffer: binding.buffer,
      })
      return await this.getBufferResult(dstBuffer)
    } else {
      return new Float32Array(0)
    }
  }

  /**
   * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param parameters - parameters used to get the result
   * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
   * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards
   * @returns - {@link Float32Array} holding {@link GPUBuffer} data
   */
  async getBufferElementResultByNames({
    bindingName,
    bufferElementName,
  }: {
    bindingName: Binding['name']
    bufferElementName: BufferElement['name']
  }): Promise<Float32Array> {
    const result = await this.getBufferBindingResultByBindingName(bindingName)

    if (!bufferElementName || result.length) {
      return result
    } else {
      const binding = this.getBufferBindingByName(bindingName)
      if (binding) {
        return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName })
      } else {
        return result
      }
    }
  }

  /* RENDER */

  /**
   * Called before rendering the Material.
   * First, check if we need to create our bind groups or pipeline
   * Then render the {@link textures}
   * Finally updates all the {@link bindGroups | bind groups}
   */
  onBeforeRender() {
    // set our material if needed
    this.compileMaterial()

    // first what needs to be done for all textures
    for (const texture of this.textures) {
      texture.render()
    }

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
    for (const bindGroup of this.bindGroups) {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup)
    }
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
