import { isRenderer } from '../../utils/renderer-utils'

export class BindGroup {
  constructor({ label = 'BindGroup', renderer, index = 0, bindings = [] }) {
    this.type = 'BindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

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

    // we might want to rebuild the whole bind group sometimes
    // like when we're adding textures after the bind group has already been created
    this.needsReset = false

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

  get shouldCreateBindGroup() {
    return !this.bindGroup
  }

  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: [],
    }
  }

  createBindGroup() {
    this.createBindingsBuffers()
    this.setBindGroupLayout()
    this.setBindGroup()
  }

  // TODO not necessarily needed
  resetBindGroup() {
    this.resetEntries()
    this.createBindGroup()
  }

  createBindingBuffer(binding) {
    binding.bindIndex = this.entries.bindGroupLayout.length

    const buffer = this.renderer.createBuffer({
      label: this.options.label + ': Uniforms buffer from:' + binding.label,
      size: binding.value.byteLength,
      usage:
        binding.bindingType === 'storage'
          ? GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
          : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.bindingsBuffers.push({
      inputBinding: binding,
      buffer,
    })

    this.entries.bindGroupLayout.push({
      binding: binding.bindIndex,
      buffer: {
        type: binding.bindingType === 'storage' ? 'read-only-storage' : binding.bindingType,
      },
      //buffer,
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
    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding)
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
      if (bindingBuffer.inputBinding && bindingBuffer.inputBinding.shouldUpdate) {
        // bufferOffset is always equals to 0 in our case
        this.renderer.queueWriteBuffer(bindingBuffer.buffer, 0, bindingBuffer.inputBinding.value)
      }

      bindingBuffer.inputBinding.shouldUpdate = false
    })
  }

  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.buffer?.destroy()
    })

    this.bindingsBuffers = []
    this.bindings = []
  }
}
