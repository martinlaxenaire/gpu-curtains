import { BindGroup } from './BindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class WorkBindGroup extends BindGroup {
  constructor({ label = 'WorkBindGroup', renderer, index = 0, bindings = [] }) {
    const type = 'WorkBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, type)

    super({ label, renderer, index, bindings })

    this.type = type
  }

  createBindingBuffer(binding) {
    binding.bindIndex = this.entries.bindGroupLayout.length

    const workBuffer = this.renderer.createBuffer({
      label: this.options.label + ': Work buffer from:' + binding.label,
      size: binding.value.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    })

    const resultBuffer = this.renderer.createBuffer({
      label: this.options.label + ': Result buffer from:' + binding.label,
      size: binding.value.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })

    this.bindingsBuffers.push({
      uniformBinding: binding,
      buffer: workBuffer,
      resultBuffer: resultBuffer,
    })

    // update right away
    binding.shouldUpdate = true

    // https://developer.mozilla.org/en-US/docs/Web/API/GPUBindGroupLayout
    this.entries.bindGroupLayout.push({
      binding: binding.bindIndex,
      buffer: {
        type: 'storage',
      },
      visibility: binding.visibility,
    })

    this.entries.bindGroup.push({
      binding: binding.bindIndex,
      resource: {
        buffer: workBuffer,
      },
    })
  }

  createBindingsBuffers() {
    this.bindings.forEach((uniformBinding) => {
      if (!uniformBinding.visibility) uniformBinding.visibility = GPUShaderStage.COMPUTE
      uniformBinding.bindingType = 'storage'

      if (!!uniformBinding.value) {
        this.createBindingBuffer(uniformBinding)
      }
    })
  }

  dispatchWorkGroups(pass) {
    this.bindings.forEach((binding) => {
      console.log(binding.value.length)
      pass.dispatchWorkgroups(binding.value.length)
    })
  }

  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.resultBuffer?.destroy()
    })

    super.destroy()
  }
}
