import { isRenderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'

let computePassIndex = 0

export class ComputePass {
  #autoAddToScene = true

  // callbacks / events
  _onReadyCallback = () => {
    /* allow empty callback */
  }
  _onBeforeRenderCallback = () => {
    /* allow empty callback */
  }
  _onRenderCallback = () => {
    /* allow empty callback */
  }
  _onAfterRenderCallback = () => {
    /* allow empty callback */
  }
  _onAfterResizeCallback = () => {
    /* allow empty callback */
  }

  constructor(renderer, parameters) {
    const type = 'ComputePass'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

    this.renderer = renderer
    this.type = type
    this.uuid = generateUUID()
    Object.defineProperty(this, 'index', { value: computePassIndex++ })

    const { label, shaders, renderOrder, inputs, inputBindGroups, autoAddToScene, useAsyncPipeline } = parameters

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

    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      inputs,
      inputBindGroups,
      useAsyncPipeline,
    })

    this.addToScene()
  }

  get ready() {
    return this._ready
  }

  set ready(value) {
    if (value) {
      this._onReadyCallback && this._onReadyCallback()
    }
    this._ready = value
  }

  setComputeMaterial(computeParameters) {
    this.material = new ComputeMaterial(this.renderer, computeParameters)
  }

  addToScene() {
    this.renderer.computePasses.push(this)

    if (this.#autoAddToScene) {
      this.renderer.scene.addComputePass(this)
    }
  }

  removeFromScene() {
    if (this.#autoAddToScene) {
      this.renderer.scene.removeComputePass(this)
    }

    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
  }

  get uniforms() {
    return this.material?.uniforms
  }

  get storages() {
    return this.material?.storages
  }

  get works() {
    return this.material?.works
  }

  resize() {
    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /** EVENTS **/

  onReady(callback) {
    if (callback) {
      this._onReadyCallback = callback
    }

    return this
  }

  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  onRender(callback) {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  onAfterResize(callback) {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  onBeforeRenderPass() {
    if (!this.renderer.ready) return

    if (this.material && this.material.ready && !this.ready) {
      this.ready = true
    }

    this._onBeforeRenderCallback && this._onBeforeRenderCallback()

    this.material.onBeforeRender()
  }

  onRenderPass(pass) {
    this._onRenderCallback && this._onRenderCallback()

    this.material.render(pass)
  }

  onAfterRenderPass() {
    this._onAfterRenderCallback && this._onAfterRenderCallback()
  }

  render(pass) {
    this.onBeforeRenderPass()

    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.onRenderPass(pass)

    this.onAfterRenderPass()
  }

  get canComputePass() {
    return this.material ? !this.material.hasMappedBuffer : false
  }

  copyBufferToResult(commandEncoder) {
    this.material?.copyBufferToResult(commandEncoder)
  }

  setWorkGroupsResult() {
    this.material?.setWorkGroupsResult()
  }

  getWorkGroupResult({ workGroupName, bindingName }) {
    return this.material?.getWorkGroupResult({ workGroupName, bindingName })
  }

  remove() {
    this.removeFromScene()
    this.destroy()
  }

  destroy() {
    if (super.destroy) super.destroy()

    this.material?.destroy()

    this.renderTextures = []
    this.textures = []
  }
}
