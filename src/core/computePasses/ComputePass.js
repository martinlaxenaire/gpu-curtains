import { isRenderer } from '../../utils/renderer-utils'
import { generateUUID, toKebabCase } from '../../utils/utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { BufferBindings } from '../bindings/BufferBindings'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

let computePassIndex = 0

export class ComputePass {
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
    this.ready = false

    const inputBindings = this.createBindings({
      uniforms: uniforms ?? [],
      storages: storages ?? [],
      works: works ?? [],
    })

    // TODO TEST
    // for (const binding in parameters.bindings) {
    //   console.log(binding, parameters.bindings[binding])
    // }

    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      ...inputBindings,
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
    this.renderer.scene.addComputePass(this)
  }

  removeFromScene() {
    this.renderer.scene.removeComputePass(this)
    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid)
  }

  createBindings({ uniforms = [], storages = [], works = [] }) {
    // TODO destructure bindings that don't use struct?
    const uniformsBindings = [
      ...uniforms.map((binding, index) => {
        const bindingParams = {
          label: binding.label || 'Uniform' + index,
          name: binding.name || 'uniform' + index,
          bindIndex: index,
          bindingType: 'uniform',
          useStruct: true,
          bindings: binding.bindings,
          visibility: 'compute',
        }

        return binding.useStruct !== false
          ? new BufferBindings(bindingParams)
          : Object.keys(binding.bindings).map((bindingKey) => {
              bindingParams.label =
                binding.label + toKebabCase(bindingKey) || 'Uniform' + toKebabCase(bindingKey) + index
              bindingParams.name = binding.name + toKebabCase(bindingKey) || 'uniform' + toKebabCase(bindingKey) + index
              bindingParams.useStruct = false
              bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

              return new BufferBindings(bindingParams)
            })
      }),
    ].flat()

    const storagesBindings = [
      ...storages.map((binding, index) => {
        const bindingParams = {
          label: binding.label || 'Storage' + index,
          name: binding.name || 'storage' + index,
          bindIndex: index,
          bindingType: 'storage',
          useStruct: true,
          bindings: binding.bindings,
          visibility: 'compute',
        }

        return binding.useStruct !== false
          ? new BufferBindings(bindingParams)
          : Object.keys(binding.bindings).map((bindingKey) => {
              bindingParams.label =
                binding.label + toKebabCase(bindingKey) || 'Storage' + toKebabCase(bindingKey) + index
              bindingParams.name = binding.name + toKebabCase(bindingKey) || 'storage' + toKebabCase(bindingKey) + index
              bindingParams.useStruct = false
              bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

              return new BufferBindings(bindingParams)
            })
      }),
    ].flat()

    const worksBindings = [
      ...works.map((binding, index) => {
        const bindingParams = {
          label: binding.label || 'Works' + index,
          name: binding.name || 'works' + index,
          bindIndex: index,
          type: 'storageWrite',
          useStruct: true,
          bindings: binding.bindings,
          dispatchSize: binding.dispatchSize,
          visibility: 'compute',
        }

        return binding.useStruct !== false
          ? new WorkBufferBindings(bindingParams)
          : Object.keys(binding.bindings).map((bindingKey) => {
              bindingParams.label = binding.label + toKebabCase(bindingKey) || 'Works' + toKebabCase(bindingKey) + index
              bindingParams.name = binding.name + toKebabCase(bindingKey) || 'works' + toKebabCase(bindingKey) + index
              bindingParams.useStruct = false
              bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

              return new WorkBufferBindings(bindingParams)
            })
      }),
    ].flat()

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
