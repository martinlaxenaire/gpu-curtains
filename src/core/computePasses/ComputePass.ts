import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { ComputeMaterialParams, MaterialParams, MaterialShaders } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture'
import { Texture } from '../textures/Texture'
import { ExternalTextureParams, TextureParams } from '../../types/Textures'

/** Defines {@link ComputePass} options */
export interface ComputePassOptions {
  /** The label of the {@link ComputePass} */
  label: string
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
  renderOrder?: number
  /** Whether the {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
  autoRender?: boolean
  /** Compute shader passed to the {@link ComputePass} following the {@link types/Materials.ShaderOptions | shader object} notation */
  shaders: MaterialShaders
  /** whether the {@link core/pipelines/ComputePipelineEntry.ComputePipelineEntry#pipeline | compute pipeline} should be compiled asynchronously */
  useAsyncPipeline?: boolean
  /** Parameters used by this {@link ComputePass} to create a {@link Texture} */
  texturesOptions?: ExternalTextureParams
  /** Default {@link ComputeMaterial} work group dispatch size to use with this {@link ComputePass} */
  dispatchSize?: number | number[]
}

/**
 * An object defining all possible {@link ComputePass} class instancing parameters
 */
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {}

let computePassIndex = 0

/**
 * Used to create a compute pass, i.e. run computations on the GPU.
 * A compute pass is basically made of a {@link ComputeMaterial} that handles most of the process.
 */
export class ComputePass {
  /** The type of the {@link ComputePass} */
  type: string
  /** The universal unique id of the {@link ComputePass} */
  uuid: string
  /** The index of the {@link ComputePass}, incremented each time a new one is instanced */
  index: number
  /** The {@link Renderer} used */
  renderer: Renderer
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene} */
  renderOrder: number

  /** Options used to create this {@link ComputePass} */
  options: ComputePassOptions

  /** {@link ComputeMaterial} used by this {@link ComputePass} */
  material: ComputeMaterial

  /** Flag indicating whether this {@link ComputePass} is ready to be rendered */
  _ready: boolean

  /** Empty object to store any additional data or custom properties into your {@link ComputePass} */
  userData: Record<string, unknown>

  /**
   * Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically
   * @private
   */
  #autoRender = true

  // callbacks / events
  /** function assigned to the {@link onReady} callback */
  _onReadyCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onBeforeRender} callback */
  _onBeforeRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onRender} callback */
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterRender} callback */
  _onAfterRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterResize} callback */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * ComputePass constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputePassParams = {}) {
    const type = 'ComputePass'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

    parameters.label = parameters.label ?? 'ComputePass ' + renderer.computePasses?.length

    this.renderer = renderer
    this.type = type
    this.uuid = generateUUID()
    Object.defineProperty(this as ComputePass, 'index', { value: computePassIndex++ })

    const {
      label,
      shaders,
      renderOrder,
      uniforms,
      storages,
      bindGroups,
      samplers,
      textures,
      renderTextures,
      autoRender,
      useAsyncPipeline,
      texturesOptions,
      dispatchSize,
    } = parameters

    this.options = {
      label,
      shaders,
      ...(autoRender !== undefined && { autoRender }),
      ...(renderOrder !== undefined && { renderOrder }),
      ...(useAsyncPipeline !== undefined && { useAsyncPipeline }),
      ...(dispatchSize !== undefined && { dispatchSize }),
      texturesOptions, // TODO default
    }

    this.renderOrder = renderOrder ?? 0

    if (autoRender !== undefined) {
      this.#autoRender = autoRender
    }

    this.userData = {}

    this.ready = false

    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      uniforms,
      storages,
      bindGroups,
      samplers,
      textures,
      renderTextures,
      useAsyncPipeline,
      dispatchSize,
    })

    this.addToScene()
  }

  /**
   * Get or set whether the compute pass is ready to render (the material has been successfully compiled)
   * @readonly
   */
  get ready(): boolean {
    return this._ready
  }

  set ready(value: boolean) {
    if (value) {
      this._onReadyCallback && this._onReadyCallback()
    }
    this._ready = value
  }

  /**
   * Add our compute pass to the scene and the renderer
   */
  addToScene() {
    this.renderer.computePasses.push(this)

    if (this.#autoRender) {
      this.renderer.scene.addComputePass(this)
    }
  }

  /**
   * Remove our compute pass from the scene and the renderer
   */
  removeFromScene() {
    if (this.#autoRender) {
      this.renderer.scene.removeComputePass(this)
    }

    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
  }

  /**
   * Create the compute pass material
   * @param computeParameters - {@link ComputeMaterial} parameters
   */
  setComputeMaterial(computeParameters: ComputeMaterialParams) {
    this.material = new ComputeMaterial(this.renderer, computeParameters)
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
   */
  loseContext() {
    this.material.loseContext()
  }

  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
   */
  restoreContext() {
    this.material.restoreContext()
  }

  /* TEXTURES */

  /**
   * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
   * @readonly
   */
  get textures(): Texture[] {
    return this.material?.textures || []
  }

  /**
   * Get our {@link ComputeMaterial#renderTextures | ComputeMaterial render textures array}
   * @readonly
   */
  get renderTextures(): RenderTexture[] {
    return this.material?.renderTextures || []
  }

  /**
   * Create a new {@link Texture}
   * @param options - {@link TextureParams | Texture parameters}
   * @returns - newly created {@link Texture}
   */
  createTexture(options: TextureParams): Texture {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    if (!options.label) {
      options.label = this.options.label + ' ' + options.name
    }

    const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions })

    this.addTexture(texture)

    return texture
  }

  /**
   * Add a {@link Texture}
   * @param texture - {@link Texture} to add
   */
  addTexture(texture: Texture) {
    this.material.addTexture(texture)
  }

  /**
   * Create a new {@link RenderTexture}
   * @param  options - {@link RenderTextureParams | RenderTexture parameters}
   * @returns - newly created {@link RenderTexture}
   */
  createRenderTexture(options: RenderTextureParams): RenderTexture {
    if (!options.name) {
      options.name = 'renderTexture' + this.renderTextures.length
    }

    const renderTexture = new RenderTexture(this.renderer, options)

    this.addRenderTexture(renderTexture)

    return renderTexture
  }

  /**
   * Add a {@link RenderTexture}
   * @param renderTexture - {@link RenderTexture} to add
   */
  addRenderTexture(renderTexture: RenderTexture) {
    this.material.addTexture(renderTexture)
  }

  /**
   * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}
   * @readonly
   */
  get uniforms(): ComputeMaterial['uniforms'] {
    return this.material?.uniforms
  }

  /**
   * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}
   * @readonly
   */
  get storages(): ComputeMaterial['storages'] {
    return this.material?.storages
  }

  /**
   * Called from the renderer, useful to trigger an after resize callback.
   */
  resize() {
    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /** EVENTS **/

  /**
   * Callback to run when the {@link ComputePass} is ready
   * @param callback - callback to run when {@link ComputePass} is ready
   */
  onReady(callback: () => void): ComputePass {
    if (callback) {
      this._onReadyCallback = callback
    }

    return this
  }

  /**
   * Callback to run before the {@link ComputePass} is rendered
   * @param callback - callback to run just before {@link ComputePass} will be rendered
   */
  onBeforeRender(callback: () => void): ComputePass {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Callback to run when the {@link ComputePass} is rendered
   * @param callback - callback to run when {@link ComputePass} is rendered
   */
  onRender(callback: () => void): ComputePass {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  /**
   * Callback to run after the {@link ComputePass} has been rendered
   * @param callback - callback to run just after {@link ComputePass} has been rendered
   */
  onAfterRender(callback: () => void): ComputePass {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /**
   * Callback used to run a custom render function instead of the default one.
   * @param callback - callback to run instead of the default render behaviour
   */
  useCustomRender(callback: (pass: GPUComputePassEncoder) => void): ComputePass {
    this.material.useCustomRender(callback)
    return this
  }

  /**
   * Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
   * @param callback - callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
   */
  onAfterResize(callback: () => void): ComputePass {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /**
   * Called before rendering the ComputePass
   * Checks if the material is ready and eventually update its struct
   */
  onBeforeRenderPass() {
    if (!this.renderer.ready) return

    if (this.material && this.material.ready && !this.ready) {
      this.ready = true
    }

    this._onBeforeRenderCallback && this._onBeforeRenderCallback()

    this.material.onBeforeRender()
  }

  /**
   * Render our {@link ComputeMaterial}
   * @param pass - current compute pass encoder
   */
  onRenderPass(pass: GPUComputePassEncoder) {
    if (!this.material.ready) return

    this._onRenderCallback && this._onRenderCallback()

    this.material.render(pass)
  }

  /**
   * Called after having rendered the ComputePass
   */
  onAfterRenderPass() {
    this._onAfterRenderCallback && this._onAfterRenderCallback()
  }

  /**
   * Render our compute pass
   * Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}
   * @param pass
   */
  render(pass: GPUComputePassEncoder) {
    this.onBeforeRenderPass()

    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.onRenderPass(pass)

    this.onAfterRenderPass()
  }

  /**
   * Copy the result of our read/write GPUBuffer into our result binding array
   * @param commandEncoder - current GPU command encoder
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.material?.copyBufferToResult(commandEncoder)
  }

  /**
   * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
   * @param parameters - parameters used to get the result
   * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
   * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
   * @async
   * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
   */
  async getComputeResult({
    bindingName,
    bufferElementName,
  }: {
    bindingName?: string
    bufferElementName?: string
  }): Promise<Float32Array> {
    return await this.material?.getComputeResult({ bindingName, bufferElementName })
  }

  /**
   * Remove the ComputePass from the scene and destroy it
   */
  remove() {
    this.removeFromScene()
    this.destroy()
  }

  /**
   * Destroy the ComputePass
   */
  destroy() {
    this.material?.destroy()
  }
}
