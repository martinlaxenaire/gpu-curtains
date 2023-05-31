export class BindGroup {
  constructor({ renderer, index = 0, bindings = [] }) {
    this.renderer = renderer

    this.index = index

    this.bindings = []
    bindings && this.setBindings(bindings)

    this.resetEntries()
    this.bindingsBuffers = []

    this.bindGroupLayout = null
    this.bindGroup = null
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

  createBindingsBuffers() {
    this.bindings.forEach((uniformBinding) => {
      if (!!uniformBinding.value) {
        const buffer = this.renderer.device.createBuffer({
          label: ': Uniforms buffer from:' + uniformBinding.label, // TODO
          size: uniformBinding.value.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.bindingsBuffers.push({
          uniformBinding,
          buffer,
        })

        this.entries.bindGroupLayout.push({
          binding: uniformBinding.bindIndex,
          buffer,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        })

        this.entries.bindGroup.push({
          binding: uniformBinding.bindIndex,
          resource: {
            buffer,
          },
        })
      }
    })
  }

  setBindGroupLayout() {
    this.bindGroupLayout = this.renderer.device.createBindGroupLayout({
      label: ': Uniform bind group layout',
      entries: this.entries.bindGroupLayout,
    })
  }

  setBindGroup() {
    this.bindGroup = this.renderer.device.createBindGroup({
      label: ': Uniform bind group', // TODO
      layout: this.bindGroupLayout,
      entries: this.entries.bindGroup,
    })
  }

  updateBindings() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      if (bindingBuffer.uniformBinding.shouldUpdate) {
        const bufferOffset = 0
        this.renderer.device.queue.writeBuffer(bindingBuffer.buffer, bufferOffset, bindingBuffer.uniformBinding.value)
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
