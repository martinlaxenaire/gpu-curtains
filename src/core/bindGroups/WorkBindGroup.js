import { BindGroup } from './BindGroup'
import { isRenderer } from '../../utils/renderer-utils'
import { getBindGroupLayoutBindingType } from '../../utils/buffers-utils'

// TODO USELESS REMOVE!
export class WorkBindGroup extends BindGroup {
  constructor({ label = 'WorkBindGroup', renderer, index = 0, bindings = [] }) {
    const type = 'WorkBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, type)

    super({ label, renderer, index, bindings })

    this.type = type
  }

  createBindingBufferElement(binding, bindIndex, array) {
    const workBuffer = this.renderer.createBuffer({
      label: this.options.label + ': Work buffer from:' + binding.label,
      size: array.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX,
    })

    const resultBuffer = this.renderer.createBuffer({
      label: this.options.label + ': Result buffer from:' + binding.label,
      size: array.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })

    this.bindingsBuffers.push({
      inputBinding: binding,
      buffer: workBuffer,
      resultBuffer: resultBuffer,
      array,
    })

    // update right away
    binding.shouldUpdate = true

    // https://developer.mozilla.org/en-US/docs/Web/API/GPUBindGroupLayout
    this.entries.bindGroupLayout.push({
      binding: bindIndex,
      buffer: {
        type: getBindGroupLayoutBindingType(binding.bindingType),
      },
      visibility: binding.visibility,
    })

    this.entries.bindGroup.push({
      binding: bindIndex,
      resource: {
        buffer: workBuffer,
      },
    })
  }

  createBindingsBuffers() {
    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.COMPUTE

      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding)
      }
    })
  }

  // dispatchWorkGroups(pass) {
  //   this.bindings.forEach((binding) => {
  //     pass.dispatchWorkgroups(binding.value.length)
  //   })
  // }

  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.resultBuffer?.destroy()
    })

    super.destroy()
  }
}
