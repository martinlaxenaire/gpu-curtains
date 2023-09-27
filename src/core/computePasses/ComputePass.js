import { isRenderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { BufferBindings } from '../bindings/BufferBindings'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

let computePassIndex = 0

export class ComputePass {
  constructor(renderer, parameters) {
    const type = 'ComputePass'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type)

    this.renderer = renderer
    this.type = type
    this.uuid = generateUUID()
    Object.defineProperty(this, 'index', { value: computePassIndex++ })

    const { label, shaders, renderOrder, uniforms, storages, works } = parameters

    this.options = {
      label,
      shaders,
      renderOrder,
      uniforms,
      storages,
      works,
    }

    this.renderOrder = renderOrder ?? 0

    const inputBindings = this.createBindings({
      uniforms: uniforms ?? [],
      storages: storages ?? [],
      works: works ?? [],
    })

    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      ...inputBindings,
    })
    this.addToScene()
  }

  setComputeMaterial(computeParameters) {
    this.material = new ComputeMaterial(this.renderer, computeParameters)
  }

  addToScene() {
    this.renderer.computePasses.push(this)
    this.renderer.scene.addComputePass(this)
  }

  removeFromScene() {
    this.renderer.scene.removeComputePass(this)
    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
  }

  createBindings({ uniforms = [], storages = [], workGroups = [], works = [] }) {
    const uniformsBindings = [
      ...uniforms.map((binding, index) => {
        return new BufferBindings({
          label: binding.label || 'Uniform' + index,
          name: binding.name || 'uniform' + index,
          bindIndex: index,
          bindingType: 'uniform',
          bindings: binding.bindings,
          visibility: 'compute',
        })
      }),
    ]

    const storagesBindings = [
      ...storages.map((binding, index) => {
        return new BufferBindings({
          label: binding.label || 'Storage' + index,
          name: binding.name || 'storage' + index,
          bindIndex: index,
          bindingType: 'storage',
          bindings: binding.bindings,
          visibility: 'compute',
        })
      }),
    ]

    const worksBindings = [
      ...works.map((binding, index) => {
        return new WorkBufferBindings({
          label: binding.label || 'Works' + index,
          name: binding.name || 'works' + index,
          bindIndex: index,
          type: 'storageWrite',
          bindings: binding.bindings,
          dispatchSize: binding.dispatchSize,
          visibility: 'compute',
        })
      }),
    ]

    return {
      uniforms: uniformsBindings,
      storages: storagesBindings,
      works: worksBindings,
    }
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

  /** EVENTS **/

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

  getWorkGroupResult(name) {
    return this.material?.getWorkGroupResult(name)
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
