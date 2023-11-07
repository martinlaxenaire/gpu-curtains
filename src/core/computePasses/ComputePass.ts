import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { MaterialParams, MaterialShaders } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/** Defines {@link ComputePass} options */
export interface ComputePassOptions {
  /** The label of the {@link ComputePass} */
  label: string
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link Scene} */
  renderOrder?: number
  /** Whether the {@link ComputePass} should be added to our {@link Scene} to let it handle the rendering process automatically */
  autoAddToScene?: boolean
  /** Compute shader passed to the {@link ComputePass} following the [shader object]{@link ShaderOptions} notation */
  shaders: MaterialShaders
  /** whether the [compute pipeline]{@link ComputePipelineEntry#pipeline} should be compiled asynchronously */
  useAsyncPipeline?: boolean
}

/**
 * An object defining all possible {@link ComputePass} class instancing parameters
 */
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {}

let computePassIndex = 0

/**
 * ComputePass class:
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
  /** Controls the order in which this {@link ComputePass} should be rendered by our {@link Scene} */
  renderOrder: number

  /** Options used to create this {@link ComputePass} */
  options: ComputePassOptions

  /** {@link ComputeMaterial} used by this {@link ComputePass} */
  material: ComputeMaterial

  /** Flag indicating whether this {@link ComputePass} is ready to be rendered */
  _ready: boolean

  /**
   * Whether this {@link ComputePass} should be added to our {@link Scene} to let it handle the rendering process automatically
   * @private
   */
  #autoAddToScene = true

  // callbacks / events
  /** function assigned to the [onReady]{@link ComputePass#onReady} callback */
  _onReadyCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onBeforeRender]{@link ComputePass#onBeforeRender} callback */
  _onBeforeRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onRender]{@link ComputePass#onRender} callback */
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterRender]{@link ComputePass#onAfterRender} callback */
  _onAfterRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterResize]{@link ComputePass#onAfterResize} callback */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * ComputePass constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - [parameters]{@link ComputePassParams} used to create our {@link ComputePass}
   */
  // TODO do we need samplers here? What about textures?
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputePassParams = {}) {
    const type = 'ComputePass'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

    this.renderer = renderer
    this.type = type
    this.uuid = generateUUID()
    Object.defineProperty(this as ComputePass, 'index', { value: computePassIndex++ })

    const { label, shaders, renderOrder, inputs, bindGroups, autoAddToScene, useAsyncPipeline } = parameters

    this.options = {
      label,
      shaders,
      ...(autoAddToScene !== undefined && { autoAddToScene }),
      ...(renderOrder !== undefined && { renderOrder }),
      ...(useAsyncPipeline !== undefined && { useAsyncPipeline }),
    }

    this.renderOrder = renderOrder ?? 0

    if (autoAddToScene !== undefined) {
      this.#autoAddToScene = autoAddToScene
    }

    this.ready = false

    // TODO samplers?
    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      inputs,
      bindGroups,
      useAsyncPipeline,
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
   * Create the compute pass material
   * @param computeParameters - {@link ComputeMaterial} parameters
   */
  setComputeMaterial(computeParameters: MaterialParams) {
    this.material = new ComputeMaterial(this.renderer, computeParameters)
  }

  /**
   * Add our compute pass to the scene and the renderer
   */
  addToScene() {
    this.renderer.computePasses.push(this)

    if (this.#autoAddToScene) {
      this.renderer.scene.addComputePass(this)
    }
  }

  /**
   * Remove our compute pass from the scene and the renderer
   */
  removeFromScene() {
    if (this.#autoAddToScene) {
      this.renderer.scene.removeComputePass(this)
    }

    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
  }

  /**
   * Get our {@link ComputeMaterial} uniforms
   * @readonly
   */
  get uniforms(): ComputeMaterial['uniforms'] {
    return this.material?.uniforms
  }

  /**
   * Get our {@link ComputeMaterial} storages
   * @readonly
   */
  get storages(): ComputeMaterial['storages'] {
    return this.material?.storages
  }

  /**
   * Get our {@link ComputeMaterial} works
   * @readonly
   */
  get works(): ComputeMaterial['works'] {
    return this.material?.works
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
   * Callback to run after the {@link Renderer} has been resized
   * @param callback - callback to run just after {@link GPURenderer} has been resized
   */
  onAfterResize(callback: () => void): ComputePass {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /**
   * Called before rendering the ComputePass
   * Checks if the material is ready and eventually update its bindings
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
   * Basically just check if our {@link GPURenderer} is ready, and then render our {@link ComputeMaterial}
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
   * Check whether we're currently accessing one of the {@link ComputeMaterial} buffer and therefore can't render our compute pass
   * @readonly
   */
  get canRender(): boolean {
    return this.material ? !this.material.hasMappedBuffer : false
  }

  /**
   * Copy the result of our read/write GPUBuffer into our result binding array
   * @param commandEncoder - current GPU command encoder
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.material?.copyBufferToResult(commandEncoder)
  }

  /**
   * Set {@link ComputeMaterial} work groups result
   */
  setWorkGroupsResult() {
    this.material?.setWorkGroupsResult()
  }

  /**
   * Get the result of a work group by binding name
   * @param workGroupName - name/key of the work group
   * @param bindingName - name/key of the input binding
   * @returns - the corresponding binding result array
   */
  getWorkGroupResult({ workGroupName, bindingName }: { workGroupName?: string; bindingName?: string }): Float32Array {
    return this.material?.getWorkGroupResult({ workGroupName, bindingName })
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

    // TODO like Mesh?
    // this.renderTextures = []
    // this.textures = []
  }
}
