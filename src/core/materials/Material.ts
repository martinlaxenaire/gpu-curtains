import { isRenderer, Renderer } from '../renderers/utils'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Sampler } from '../samplers/Sampler'
import { AllowedPipelineEntries, GPUPassTypes } from '../pipelines/PipelineManager'
import { BufferBinding, BufferBindingInput } from '../bindings/BufferBinding'
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement } from '../../types/BindGroups'
import { Texture } from '../textures/Texture'
import { MediaTexture } from '../textures/MediaTexture'
import { FullShadersType, MaterialOptions, MaterialParams, MaterialTexture, ShaderOptions } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Binding } from '../bindings/Binding'
import { generateUUID } from '../../utils/utils'
import { BufferElement } from '../bindings/bufferElements/BufferElement'
import { Buffer } from '../buffers/Buffer'

/**
 * Used as a base to create a {@link Material}.
 *
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
  /** The type of the {@link Material}. */
  type: string
  /** The universal unique id of the {@link Material}. */
  readonly uuid: string
  /** The {@link Renderer} used. */
  renderer: Renderer
  /** Options used to create this {@link Material}. */
  options: MaterialOptions

  /** Pipeline entry used by this {@link Material}. */
  pipelineEntry: AllowedPipelineEntries

  /**
   * Array of {@link BindGroup | bind groups} used by this {@link Material}.
   * This array respects a specific order:
   * 1. The {@link texturesBindGroup | textures bind groups}.
   * 2. The {@link BindGroup | bind group} created using {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters if any.
   * 3. Additional {@link MaterialParams#bindGroups | bind groups} parameters if any.
   */
  bindGroups: AllowedBindGroups[]
  /** Array of {@link TextureBindGroup | texture bind groups} used by this {@link Material}. */
  texturesBindGroups: TextureBindGroup[]
  /** Array of {@link BindGroup | bind groups} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material}. */
  inputsBindGroups: BindGroup[]
  /** Array of {@link BindGroup | cloned bind groups} created by this {@link Material}. */
  clonedBindGroups: AllowedBindGroups[]

  /** Object containing all uniforms inputs handled by this {@link Material}. */
  uniforms: Record<string, Record<string, BufferBindingInput>>
  /** Object containing all read only or read/write storages inputs handled by this {@link Material}. */
  storages: Record<string, Record<string, BufferBindingInput>>

  /** Map of {@link Binding | bindings} created using the {@link types/BindGroups.BindGroupInputs#uniforms | uniforms} and {@link types/BindGroups.BindGroupInputs#storages | storages} parameters when instancing this {@link Material}. */
  inputsBindings: Map<string, BindGroupBindingElement>

  /** Array of {@link Texture} or {@link MediaTexture} handled by this {@link Material}. */
  textures: MaterialTexture[]
  /** Array of {@link Sampler} handled by this {@link Material}. */
  samplers: Sampler[]

  /**
   * Material constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link Material}.
   * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams) {
    this.type = 'Material'

    renderer = isRenderer(renderer, this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    const { shaders, label, useAsyncPipeline, uniforms, storages, bindings, bindGroups, samplers, textures } =
      parameters

    this.options = {
      shaders,
      label: label || this.constructor.name,
      useAsyncPipeline: useAsyncPipeline === undefined ? true : useAsyncPipeline,
      ...(uniforms !== undefined && { uniforms }),
      ...(storages !== undefined && { storages }),
      ...(bindings !== undefined && { bindings }),
      ...(bindGroups !== undefined && { bindGroups }),
      ...(samplers !== undefined && { samplers }),
      ...(textures !== undefined && { textures }),
    }

    this.bindGroups = []
    this.texturesBindGroups = []
    this.clonedBindGroups = []

    this.setBindGroups()

    this.setTextures()
    this.setSamplers()
  }

  /**
   * Set or reset this {@link Material} {@link Material.renderer | renderer}. Also reset the {@link bindGroups} renderer.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    renderer = isRenderer(renderer, this.type)
    this.renderer = renderer

    this.bindGroups.forEach((bindGroup) => {
      bindGroup.setRenderer(this.renderer)
    })

    if (this.pipelineEntry) {
      this.pipelineEntry.setRenderer(this.renderer)
    }
  }

  /**
   * Check if all bind groups are ready, and create them if needed.
   */
  async compileMaterial(): Promise<void> {
    const createBindGroups = () => {
      const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0
      const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength

      if (!bindGroupsReady) {
        this.createBindGroups()
      }
    }

    if (this.renderer.ready) {
      createBindGroups()
    } else {
      await new Promise<void>((resolve) => {
        const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
          () => {
            if (this.renderer.device) {
              this.renderer.onBeforeCommandEncoderCreation.remove(taskId)
              createBindGroups()
              resolve()
            }
          },
          { once: false }
        )
      })
    }
  }

  /**
   * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled.
   * @readonly
   */
  get ready(): boolean {
    return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready)
  }

  /**
   * Get the {@link Material} pipeline buffers cache key based on its {@link BindGroup} cache keys.
   * @returns - Current cache key.
   * @readonly
   */
  get cacheKey(): string {
    let cacheKey = ''
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindings.forEach((binding) => {
        cacheKey += binding.name + ','
      })
      cacheKey += bindGroup.pipelineCacheKey
    })

    return cacheKey
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to `null`, so they will be reset next time we try to render.
   */
  loseContext() {
    // start with the textures
    for (const texture of this.textures) {
      texture.texture = null
      if (texture instanceof MediaTexture) {
        texture.sources.forEach((source) => (source.sourceUploaded = false))
        texture.sourcesUploaded = false
      }
    }

    // then bind groups and struct
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) =>
      bindGroup.loseContext()
    )

    // reset pipeline as well
    this.pipelineEntry.pipeline = null
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our samplers, textures and bind groups.
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
      if (texture instanceof MediaTexture) {
        // TODO needed?
        //texture.createTexture()
        texture.sources.forEach((source) => {
          if (source.sourceLoaded) {
            source.shouldUpdate = true
          }
        })
      }

      texture.resize(texture.size)
    }

    // now the bind groups
    ;[...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
      bindGroup.restoreContext()
    })
  }

  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="full"] - Shader to get the code from.
   * @returns - The corresponding shader code.
   */
  async getShaderCode(shaderType: FullShadersType = 'full'): Promise<string> {
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

    if (this.pipelineEntry) {
      return this.pipelineEntry.shaders[shaderType].code
    } else {
      return new Promise<string>((resolve) => {
        const taskId = this.renderer.onBeforeRenderScene.add(
          () => {
            if (this.pipelineEntry) {
              this.renderer.onBeforeRenderScene.remove(taskId)
              resolve(this.pipelineEntry.shaders[shaderType].code)
            }
          },
          { once: false }
        )
      })
    }
  }

  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="vertex"] - Shader to get the code from.
   * @returns - The corresponding shader code.
   */
  async getAddedShaderCode(shaderType: FullShadersType = 'vertex'): Promise<string> {
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

    if (this.pipelineEntry) {
      return this.pipelineEntry.shaders[shaderType].head
    } else {
      return new Promise<string>((resolve) => {
        const taskId = this.renderer.onBeforeRenderScene.add(
          () => {
            if (this.pipelineEntry) {
              this.renderer.onBeforeRenderScene.remove(taskId)
              resolve(this.pipelineEntry.shaders[shaderType].head)
            }
          },
          { once: false }
        )
      })
    }
  }

  /* BIND GROUPS */

  /**
   * Prepare and set our bind groups based on inputs and bindGroups Material parameters.
   */
  setBindGroups() {
    this.uniforms = {}
    this.storages = {}

    this.inputsBindGroups = []
    this.inputsBindings = new Map()

    if (this.options.uniforms || this.options.storages || this.options.bindings) {
      const inputsBindGroup = new BindGroup(this.renderer, {
        label: this.options.label + ': Bindings bind group',
        uniforms: this.options.uniforms,
        storages: this.options.storages,
        bindings: this.options.bindings,
      })

      this.processBindGroupBindings(inputsBindGroup)
      this.inputsBindGroups.push(inputsBindGroup)
      inputsBindGroup.consumers.add(this.uuid)
    }

    this.options.bindGroups?.forEach((bindGroup) => {
      this.processBindGroupBindings(bindGroup)
      this.inputsBindGroups.push(bindGroup)
      bindGroup.consumers.add(this.uuid)
    })
  }

  /**
   * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct.
   * @readonly
   */
  get texturesBindGroup(): TextureBindGroup {
    return this.texturesBindGroups[0]
  }

  /**
   * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
   * @param bindGroup - The {@link BindGroup} to process.
   */
  processBindGroupBindings(bindGroup: BindGroup) {
    for (const inputBinding of bindGroup.bindings) {
      this.inputsBindings.set(inputBinding.name, inputBinding)
    }

    this.uniforms = {
      ...this.uniforms,
      ...bindGroup.uniforms,
    }

    this.storages = {
      ...this.storages,
      ...bindGroup.storages,
    }
  }

  /**
   * Create the bind groups if they need to be created.
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
          if (!this.textures.find((t) => t.uuid !== texture.uuid)) {
            this.textures.push(texture)
          }
        }
      }
    })
  }

  /**
   * Clones a {@link BindGroup} from a list of buffers.
   * Useful to create a new{@link BindGroup} with already created buffers, but swapped.
   * @param parameters - parameters used to clone the {@link BindGroup}.
   * @param parameters.bindGroup - the {@link BindGroup} to clone.
   * @param parameters.bindings - our input binding buffers.
   * @param parameters.keepLayout - whether we should keep original bind group layout or not.
   * @returns - the cloned {@link BindGroup}.
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
   * @param bindingName - the binding name/key to look for.
   * @returns - {@link BindGroup} found or null if not found.
   */
  getBindGroupByBindingName(bindingName: BufferBinding['name'] = ''): AllowedBindGroups | null {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName)
    })
  }

  /**
   * Destroy a {@link BindGroup}, only if it is not used by another object.
   * @param bindGroup - {@link BindGroup} to eventually destroy.
   */
  destroyBindGroup(bindGroup: AllowedBindGroups) {
    // remove this material as a consumer of the bind group
    bindGroup.consumers.delete(this.uuid)

    // if the bind group does not have another consumer
    // destroy it
    if (!bindGroup.consumers.size) {
      bindGroup.destroy()
    }
  }

  /**
   * Destroy all {@link BindGroup}.
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
   * Update all {@link BindGroup}.
   */
  updateBindGroups() {
    // now update all bind groups in use and check if they need to flush the pipeline
    for (const bindGroup of this.bindGroups) {
      this.updateBindGroup(bindGroup)
    }
  }

  /**
   * {@link BindGroup#update | Update a BindGroup}:
   * - Update the textures if it's a {@link texturesBindGroups | textures bind group}.
   * - Update its {@link BindGroup#bufferBindings | buffer bindings}.
   * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}.
   * - Check if we need to flush the pipeline.
   * @param bindGroup - {@link BindGroup} to update.
   */
  updateBindGroup(bindGroup: BindGroup) {
    bindGroup.update()

    // if a bind group needs to flush the pipeline
    // usually happens if one of the struct bindingType has changed,
    // which means the shader should be re-patched and recreated
    if (bindGroup.needsPipelineFlush && this.pipelineEntry?.ready) {
      this.pipelineEntry.flushPipelineEntry(this.bindGroups)
    }

    bindGroup.needsPipelineFlush = false
  }

  /* INPUTS */

  /**
   * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key.
   * @returns - The found binding, or null if not found.
   */
  getBindingByName(bindingName: Binding['name'] = ''): BindGroupBindingElement | undefined {
    return this.inputsBindings.get(bindingName)
  }

  /**
   * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}.
   * @param bindingName - The binding name or key.
   * @returns - The found binding, or null if not found.
   */
  getBufferBindingByName(bindingName: Binding['name'] = ''): BindGroupBufferBindingElement | undefined {
    const bufferBinding = this.getBindingByName(bindingName)
    return bufferBinding && 'buffer' in bufferBinding ? bufferBinding : undefined
  }

  /**
   * Force setting a given {@link BufferBindingInput | buffer binding} shouldUpdate flag to `true` to update it at next render.
   * @param bufferBindingName - The buffer binding name.
   * @param bindingName - The binding name.
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
   * Prepare our {@link Material.textures | textures} array and set the {@link TextureBindGroup}.
   */
  setTextures() {
    this.textures = []
    this.texturesBindGroups.push(
      new TextureBindGroup(this.renderer, {
        label: this.options.label + ': Textures bind group',
      })
    )

    this.texturesBindGroup.consumers.add(this.uuid)

    this.options.textures?.forEach((texture) => {
      this.addTexture(texture)
    })
  }

  /**
   * Add a {@link MediaTexture} or {@link Texture} to our {@link textures} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
   * @param texture - {@link MediaTexture} or {@link Texture} to add.
   */
  addTexture(texture: MaterialTexture) {
    this.textures.push(texture)

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
   * Destroy a {@link MediaTexture} or {@link Texture}, only if it is not used by another object or cached.
   * @param texture - {@link MediaTexture} or {@link Texture} to eventually destroy.
   */
  destroyTexture(texture: MaterialTexture) {
    // do not destroy a texture that must stay in cache
    if ((texture as MediaTexture).options.cache) return
    if (!(texture as Texture).options.autoDestroy) return

    // check if this texture is used by another object before actually destroying it
    const objectsUsingTexture = this.renderer.getObjectsByTexture(texture)

    const shouldDestroy =
      !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid)

    if (shouldDestroy) {
      texture.destroy()
    }
  }

  /**
   * Destroy all the Material {@link textures}.
   */
  destroyTextures() {
    this.textures?.forEach((texture) => this.destroyTexture(texture))
    this.textures = []
  }

  /**
   * Prepare our {@link Material.samplers | samplers} array and always add a default {@link Sampler} if not already passed as parameter.
   */
  setSamplers() {
    this.samplers = []

    this.options.samplers?.forEach((sampler) => {
      this.addSampler(sampler)
    })

    // create our default sampler if needed
    const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === 'defaultSampler')
    if (!hasDefaultSampler) {
      const sampler = new Sampler(this.renderer, { label: 'Default sampler', name: 'defaultSampler' })
      this.addSampler(sampler)
    }
  }

  /**
   * Add a {@link Sampler} to our {@link samplers} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
   * @param sampler - {@link Sampler} to add.
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)

    // is it used in our shaders?
    if (
      (this.options.shaders &&
        this.options.shaders.vertex &&
        this.options.shaders.vertex.code.indexOf(sampler.name) !== -1) ||
      (this.options.shaders &&
        this.options.shaders.fragment &&
        (this.options.shaders.fragment as ShaderOptions).code.indexOf(sampler.name) !== -1) ||
      (this.options.shaders &&
        this.options.shaders.compute &&
        this.options.shaders.compute.code.indexOf(sampler.name) !== -1)
    ) {
      this.texturesBindGroup.addSampler(sampler)
    }
  }

  /* BUFFER RESULTS */

  /**
   * Map a {@link Buffer#GPUBuffer | Buffer's GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param buffer - {@link Buffer} to use for mapping.
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
   */
  async getBufferResult(buffer: Buffer): Promise<Float32Array> {
    return await buffer.mapBufferAsync()
  }

  /**
   * Map the content of a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
   * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
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
   * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
   * @param parameters - Parameters used to get the result.
   * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
   * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards.
   * @returns - {@link Float32Array} holding {@link GPUBuffer} data.
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
   * First, check if we need to create our bind groups or pipeline.
   * Finally, updates all the {@link bindGroups | bind groups}.
   */
  onBeforeRender() {
    // set our material if needed
    this.compileMaterial()

    // update bind groups
    this.updateBindGroups()
  }

  /**
   * Set the current pipeline.
   * @param pass - Current pass encoder.
   */
  setPipeline(pass: GPUPassTypes) {
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry)
  }

  /**
   * Use the {@link Renderer#pipelineManager | renderer pipelineManager} to only set the bind groups that are not already set.
   * @param pass - Current pass encoder.
   */
  setActiveBindGroups(pass: GPUPassTypes) {
    this.renderer.pipelineManager.setActiveBindGroups(pass, this.bindGroups)
  }

  /**
   * Render the material if it is ready:
   * Set the current pipeline and set the bind groups.
   * @param pass - Current pass encoder.
   */
  render(pass: GPUPassTypes) {
    // renderer or pipeline are not ready yet
    // not really needed since meshes/compute passes do already check it beforehand
    // mostly here as a safeguard
    if (!this.ready) return

    // set current pipeline
    this.setPipeline(pass)

    // only set the bind groups that need to be set
    this.setActiveBindGroups(pass)
  }

  /**
   * Destroy the Material.
   */
  destroy() {
    // destroy all buffers created with createBuffer
    this.destroyBindGroups()
    this.destroyTextures()
  }
}
