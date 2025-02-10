import { isRenderer, Renderer } from '../renderers/utils'
import { generateUUID, throwWarning } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { ComputeMaterialParams, MaterialParams, MaterialShaders } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture, TextureParams } from '../textures/Texture'
import { SceneObjectTextureOptions } from '../../types/Textures'
import { MediaTexture, MediaTextureParams } from '../textures/MediaTexture'

/** Defines {@link ComputePass} options. */
export interface ComputePassOptions {
  /** The label of the {@link ComputePass}. */
  label: string
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
  renderOrder?: number
  /** Whether the {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. */
  autoRender?: boolean
  /** Compute shader passed to the {@link ComputePass} following the {@link types/Materials.ShaderOptions | shader object} notation. */
  shaders: MaterialShaders
  /** whether the {@link core/pipelines/ComputePipelineEntry.ComputePipelineEntry#pipeline | compute pipeline} should be compiled asynchronously. */
  useAsyncPipeline?: boolean
  /** Parameters used by this {@link ComputePass} to create a {@link MediaTexture}. */
  texturesOptions?: SceneObjectTextureOptions
  /** Default {@link ComputeMaterial} work group dispatch size to use with this {@link ComputePass}. */
  dispatchSize?: number | number[]
}

/**
 * An object defining all possible {@link ComputePass} class instancing parameters.
 */
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {}

let computePassIndex = 0

/**
 * Used to create a {@link ComputePass}, i.e. run computations on the GPU.<br>
 * A {@link ComputePass} is basically a wrapper around a {@link ComputeMaterial} that handles most of the process.
 *
 * The default render behaviour of a {@link ComputePass} is to set its {@link core/bindGroups/BindGroup.BindGroup | bind groups} and then dispatch the workgroups based on the provided {@link ComputeMaterial#dispatchSize | dispatchSize}.<br>
 * However, most of the time you'd want a slightly more complex behaviour. The {@link ComputePass#useCustomRender | `useCustomRender` hook} lets you define a totally custom behaviour, but you'll have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // let's assume we are going to compute the positions of 100.000 particles
 * const nbParticles = 100_000
 *
 * const computePass = new ComputePass(gpuCurtains, {
 *   label: 'My compute pass',
 *   shaders: {
 *     compute: {
 *       code: computeShaderCode, // assume it is a valid WGSL compute shader
 *     },
 *   },
 *   dispatchSize: Math.ceil(nbParticles / 64),
 *   storages: {
 *     particles: {
 *       access: 'read_write',
 *       struct: {
 *         position: {
 *           type: 'array<vec4f>',
 *           value: new Float32Array(nbParticles * 4),
 *         },
 *       },
 *     },
 *   },
 * })
 * ```
 */
export class ComputePass {
  /** The type of the {@link ComputePass}. */
  type: string
  /** The universal unique id of the {@link ComputePass}. */
  uuid: string
  /** The index of the {@link ComputePass}, incremented each time a new one is instanced. */
  index: number
  /** The {@link Renderer} used. */
  renderer: Renderer
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
  renderOrder: number

  /** Options used to create this {@link ComputePass}. */
  options: ComputePassOptions

  /** {@link ComputeMaterial} used by this {@link ComputePass}. */
  material: ComputeMaterial

  /** Flag indicating whether this {@link ComputePass} is ready to be rendered. */
  _ready: boolean

  /** Empty object to store any additional data or custom properties into your {@link ComputePass}. */
  userData: Record<string, unknown>

  /**
   * Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically.
   * @private
   */
  #autoRender = true

  // callbacks / events
  /** function assigned to the {@link onReady} callback. */
  _onReadyCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onBeforeRender} callback. */
  _onBeforeRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onRender} callback. */
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterRender} callback. */
  _onAfterRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onAfterResize} callback. */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * ComputePass constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
   * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputePassParams = {}) {
    const type = 'ComputePass'

    renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

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
      bindings,
      bindGroups,
      samplers,
      textures,
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
      ...(dispatchSize !== undefined && { dispatchSize }),
      useAsyncPipeline: useAsyncPipeline === undefined ? true : useAsyncPipeline,
      texturesOptions, // TODO default
    }

    this.renderOrder = renderOrder ?? 0

    if (autoRender !== undefined) {
      this.#autoRender = autoRender
    }

    this.userData = {}

    this.ready = false

    this.setMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      uniforms,
      storages,
      bindings,
      bindGroups,
      samplers,
      textures,
      useAsyncPipeline,
      dispatchSize,
    })

    this.addToScene(true)
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
   * Add our {@link ComputePass} to the scene and optionally to the renderer.
   * @param addToRenderer - whether to add this {@link ComputePass} to the {@link Renderer#computePasses | Renderer computePasses array}
   */
  addToScene(addToRenderer = false) {
    if (addToRenderer) {
      this.renderer.computePasses.push(this)
    }

    if (this.#autoRender) {
      this.renderer.scene.addComputePass(this)
    }
  }

  /**
   * Remove our {@link ComputePass} from the scene and optionally from the renderer as well.
   * @param removeFromRenderer - whether to remove this {@link ComputePass} from the {@link Renderer#computePasses | Renderer computePasses array}.
   */
  removeFromScene(removeFromRenderer = false) {
    if (this.#autoRender) {
      this.renderer.scene.removeComputePass(this)
    }

    if (removeFromRenderer) {
      this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
    }
  }

  /**
   * Set a new {@link Renderer} for this {@link ComputePass}.
   * @param renderer - new {@link Renderer} to set.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    if (
      !renderer ||
      !(
        renderer.type === 'GPURenderer' ||
        renderer.type === 'GPUCameraRenderer' ||
        renderer.type === 'GPUCurtainsRenderer'
      )
    ) {
      throwWarning(
        `${this.options.label}: Cannot set ${renderer} as a renderer because it is not of a valid Renderer type.`
      )
      return
    }

    this.material?.setRenderer(renderer)

    this.removeFromScene(true)
    this.renderer = renderer
    this.addToScene(true)
  }

  /**
   * Create the compute pass material
   * @param computeParameters - {@link ComputeMaterial} parameters
   */
  setMaterial(computeParameters: ComputeMaterialParams) {
    this.useMaterial(new ComputeMaterial(this.renderer, computeParameters))
  }

  /**
   * Set or update the {@link ComputePass} {@link ComputeMaterial}
   * @param material - new {@link ComputeMaterial} to use
   */
  useMaterial(material: ComputeMaterial) {
    this.material = material
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
   * Create a new {@link MediaTexture}.
   * @param options - {@link MediaTextureParams | MediaTexture parameters}.
   * @returns - newly created {@link MediaTexture}.
   */
  createMediaTexture(options: MediaTextureParams): MediaTexture {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    if (!options.label) {
      options.label = this.options.label + ' ' + options.name
    }

    const texture = new MediaTexture(this.renderer, { ...options, ...this.options.texturesOptions })

    this.addTexture(texture)

    return texture
  }

  /**
   * Create a new {@link Texture}.
   * @param  options - {@link TextureParams | Texture parameters}.
   * @returns - newly created {@link Texture}.
   */
  createTexture(options: TextureParams): Texture {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    const texture = new Texture(this.renderer, options)

    this.addTexture(texture)

    return texture
  }

  /**
   * Add a {@link Texture} or {@link MediaTexture}.
   * @param texture - {@link Texture} to add.
   */
  addTexture(texture: Texture | MediaTexture) {
    this.material.addTexture(texture)
  }

  /**
   * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}.
   * @readonly
   */
  get uniforms(): ComputeMaterial['uniforms'] {
    return this.material?.uniforms
  }

  /**
   * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}.
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
   * @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
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

    this._onBeforeRenderCallback && this._onBeforeRenderCallback()

    this.material.onBeforeRender()

    if (this.material && this.material.ready && !this.ready) {
      this.ready = true
    }
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

    !this.renderer.production && pass.pushDebugGroup(this.options.label)

    this.onRenderPass(pass)

    !this.renderer.production && pass.popDebugGroup()

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
    this.removeFromScene(true)
    this.destroy()
  }

  /**
   * Destroy the ComputePass
   */
  destroy() {
    this.material?.destroy()
  }
}
