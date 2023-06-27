import { isRenderer } from '../../utils/renderer-utils'

export class BindGroup {
  constructor({ label = 'BindGroup', renderer, index = 0, bindings = [] }) {
    this.type = 'BindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('BindGroup fail')
      return
    }

    this.renderer = renderer
    this.options = {
      label,
    }

    this.index = index

    this.bindings = []
    bindings && this.setBindings(bindings)

    this.resetEntries()
    this.bindingsBuffers = []

    this.bindGroupLayout = null
    this.bindGroup = null

    // if we ever update our bind group layout
    // we'll need to update the bind group as well
    // and most importantly recreate the whole pipeline again
    this.needsPipelineFlush = false
  }

  setIndex(index) {
    this.index = index
  }

  setBindings(bindings) {
    this.bindings = bindings
  }

  addBinding(binding) {
    this.bindings.push(binding)
  }

  canCreateBindGroup() {
    return !this.bindGroup
  }

  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: [],
    }
  }

  createBindingBuffer(binding) {
    binding.bindIndex = this.entries.bindGroupLayout.length

    const buffer = this.renderer.createBuffer({
      label: this.options.label + ': Uniforms buffer from:' + binding.label,
      size: binding.value.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.bindingsBuffers.push({
      uniformBinding: binding,
      buffer,
    })

    this.entries.bindGroupLayout.push({
      binding: binding.bindIndex,
      buffer,
      visibility: binding.visibility,
    })

    this.entries.bindGroup.push({
      binding: binding.bindIndex,
      resource: {
        buffer,
      },
    })
  }

  createBindingsBuffers() {
    this.bindings.forEach((uniformBinding) => {
      if (!uniformBinding.visibility) uniformBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!uniformBinding.value) {
        this.createBindingBuffer(uniformBinding)
      }
    })
  }

  setBindGroupLayout() {
    this.bindGroupLayout = this.renderer.createBindGroupLayout({
      label: this.options.label + ': Uniform bind group layout',
      entries: this.entries.bindGroupLayout,
    })
  }

  setBindGroup() {
    this.bindGroup = this.renderer.createBindGroup({
      label: this.options.label + ': Uniform bind group',
      layout: this.bindGroupLayout,
      entries: this.entries.bindGroup,
    })
  }

  updateBindings() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      if (bindingBuffer.uniformBinding.shouldUpdate) {
        const bufferOffset = 0
        this.renderer.queueWriteBuffer(bindingBuffer.buffer, bufferOffset, bindingBuffer.uniformBinding.value)
      }

      bindingBuffer.uniformBinding.shouldUpdate = false
    })
  }

  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.buffer?.destroy()
    })
  }
}
