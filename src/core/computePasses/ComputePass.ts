import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { MaterialParams, MaterialShaders } from '../../types/core/materials/Material'
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

  constructor(renderer: Renderer | GPUCurtains, parameters: ComputePassParams) {
    const type = 'ComputePass'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

    this.renderer = renderer
    this.type = type
    this.uuid = generateUUID()
    Object.defineProperty(this as ComputePass, 'index', { value: computePassIndex++ })

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

  get ready(): boolean {
    return this._ready
  }

  set ready(value: boolean) {
    if (value) {
      this._onReadyCallback && this._onReadyCallback()
    }
    this._ready = value
  }

  setComputeMaterial(computeParameters: MaterialParams) {
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

  get uniforms(): ComputeMaterial['uniforms'] {
    return this.material?.uniforms
  }

  get storages(): ComputeMaterial['storages'] {
    return this.material?.storages
  }

  get works(): ComputeMaterial['works'] {
    return this.material?.works
  }

  resize() {
    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /** EVENTS **/

  onReady(callback: () => void): ComputePass {
    if (callback) {
      this._onReadyCallback = callback
    }

    return this
  }

  onBeforeRender(callback: () => void): ComputePass {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  onRender(callback: () => void): ComputePass {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  onAfterRender(callback: () => void): ComputePass {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  onAfterResize(callback: () => void): ComputePass {
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

  onRenderPass(pass: GPUComputePassEncoder) {
    this._onRenderCallback && this._onRenderCallback()

    this.material.render(pass)
  }

  onAfterRenderPass() {
    this._onAfterRenderCallback && this._onAfterRenderCallback()
  }

  render(pass: GPUComputePassEncoder) {
    this.onBeforeRenderPass()

    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.onRenderPass(pass)

    this.onAfterRenderPass()
  }

  get canComputePass(): boolean {
    return this.material ? !this.material.hasMappedBuffer : false
  }

  copyBufferToResult(commandEncoder: GPUCommandEncoder) {
    this.material?.copyBufferToResult(commandEncoder)
  }

  setWorkGroupsResult() {
    this.material?.setWorkGroupsResult()
  }

  getWorkGroupResult({ workGroupName, bindingName }: { workGroupName?: string; bindingName?: string }): Float32Array {
    return this.material?.getWorkGroupResult({ workGroupName, bindingName })
  }

  remove() {
    this.removeFromScene()
    this.destroy()
  }

  destroy() {
    this.material?.destroy()

    // TODO like Mesh?
    // this.renderTextures = []
    // this.textures = []
  }
}
