import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { MaterialParams, MaterialShaders } from '../../types/Materials'
import { GPUCurtains } from '../../curtains/GPUCurtains'

export interface ComputePassOptions {
  label: string
  renderOrder?: number
  autoAddToScene?: boolean
  shaders: MaterialShaders
  useAsyncPipeline?: boolean
}

export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {}

let computePassIndex = 0

/**
 * ComputePass class:
 * Used to create a compute pass, i.e. run computations on the GPU.
 * A compute pass is basically made of a {@see ComputeMaterial} that handles most of the process.
 */
export class ComputePass {
  type: string
  uuid: string
  index: number
  renderer: Renderer
  renderOrder: number

  options: ComputePassOptions

  material: ComputeMaterial

  _ready: boolean

  #autoAddToScene = true

  // callbacks / events
  _onReadyCallback: () => void = () => {
    /* allow empty callback */
  }
  _onBeforeRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  _onAfterRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * ComputePass constructor
   * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
   * @param {ComputePassParams=} parameters - parameters used to create our compute pass
   * @param {string=} parameters.label - compute pass label
   * @param {boolean=} parameters.autoAddToScene - whether we should add this compute pass to our {@see Scene} to let it handle the rendering process automatically
   * @param {number=} parameters.renderOrder - controls the order in which this compute pass should be rendered by our {@see Scene}
   * @param {boolean=} parameters.useAsyncPipeline - whether the compute pipeline should be compiled asynchronously
   * @param {MaterialShaders=} parameters.shaders - our compute shader code and entry point
   * @param {BindGroupInputs=} parameters.inputs - our {@see BindGroup} inputs
   * @param {BindGroup[]=} parameters.bindGroups - already created {@see BindGroup} to use
   * @param {Sampler[]=} parameters.samplers - array of {@see Sampler}
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
   * @type {boolean}
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
   * @param {MaterialParams} computeParameters - {@see ComputeMaterial} parameters
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
   * Get our {@see ComputeMaterial} uniforms
   * @readonly
   * @type {ComputeMaterial['uniforms']}
   */
  get uniforms(): ComputeMaterial['uniforms'] {
    return this.material?.uniforms
  }

  /**
   * Get our {@see ComputeMaterial} storages
   * @readonly
   * @type {ComputeMaterial['storages']}
   */
  get storages(): ComputeMaterial['storages'] {
    return this.material?.storages
  }

  /**
   * Get our {@see ComputeMaterial} works
   * @readonly
   * @type {ComputeMaterial['works']}
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
   * Assign a callback function to _onReadyCallback
   * @param {function=} callback - callback to run when {@see ComputePass} is ready
   * @returns {ComputePass}
   */
  onReady(callback: () => void): ComputePass {
    if (callback) {
      this._onReadyCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param {function=} callback - callback to run just before {@see ComputePass} will be rendered
   * @returns {ComputePass}
   */
  onBeforeRender(callback: () => void): ComputePass {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onRenderCallback
   * @param {function=} callback - callback to run when {@see ComputePass} is rendered
   * @returns {ComputePass}
   */
  onRender(callback: () => void): ComputePass {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onAfterRenderCallback
   * @param {function=} callback - callback to run just after {@see ComputePass} has been rendered
   * @returns {ComputePass}
   */
  onAfterRender(callback: () => void): ComputePass {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param {function=} callback - callback to run just after {@see GPURenderer} has been resized
   * @returns {ComputePass}
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
   * Render our {@see ComputeMaterial}
   * @param {GPUComputePassEncoder} pass - current compute pass encoder
   */
  onRenderPass(pass: GPUComputePassEncoder) {
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
   * Basically just check if our {@see GPURenderer} is ready, and then render our {@see ComputeMaterial}
   * @param {GPUComputePassEncoder} pass
   */
  render(pass: GPUComputePassEncoder) {
    this.onBeforeRenderPass()

    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.onRenderPass(pass)

    this.onAfterRenderPass()
  }

  /**
   * Check whether we're currently accessing one of the {@see ComputeMaterial} buffer and therefore can't render our compute pass
   * @readonly
   * @type {boolean}
   */
  get canRender(): boolean {
    return this.material ? !this.material.hasMappedBuffer : false
  }

  /**
   * Copy the result of our read/write GPUBuffer into our result binding array
   * @param {GPUCommandEncoder} commandEncoder - current GPU command encoder
   */
  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.material?.copyBufferToResult(commandEncoder)
  }

  /**
   * Set {@see ComputeMaterial} work groups result
   */
  setWorkGroupsResult() {
    this.material?.setWorkGroupsResult()
  }

  /**
   * Get the result of a work group by binding name
   * @param {string=} workGroupName - name/key of the work group
   * @param {string=} bindingName - name/key of the input binding
   * @returns {Float32Array} - the corresponding binding result array
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
