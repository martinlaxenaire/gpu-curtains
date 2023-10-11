import { isRenderer } from '../../utils/renderer-utils'
import { generateUUID } from '../../utils/utils'
import { getBindGroupLayoutBindingType } from '../../utils/buffers-utils'

export class BindGroup {
  constructor({ label = 'BindGroup', renderer, index = 0, bindings = [] }) {
    this.type = 'BindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, this.type)

    this.renderer = renderer
    this.options = {
      label,
      index,
      bindings,
    }

    this.index = index
    this.uuid = generateUUID()

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

  createBindingBufferElement(binding, bindIndex, array) {
    const buffer = this.renderer.createBuffer({
      label: this.options.label + ': ' + binding.bindingType + ' buffer from:' + binding.label,
      size: array.byteLength,
      usage:
        binding.bindingType === 'uniform'
          ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
          : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX,
    })

    this.bindingsBuffers.push({
      inputBinding: binding,
      buffer,
      array,
    })

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
        buffer,
      },
    })
  }

  createBindingBuffer(binding) {
    if (!binding.useStruct) {
      binding.bindingElements.forEach((bindingElement) => {
        const bindIndex = this.entries.bindGroupLayout.length

        this.createBindingBufferElement(binding, bindIndex, bindingElement.array)
      })
    } else {
      binding.bindIndex = this.entries.bindGroupLayout.length

      this.createBindingBufferElement(binding, binding.bindIndex, binding.value)
    }
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
      label: this.options.label + ': bind group layout',
      entries: this.entries.bindGroupLayout,
    })
  }

  setBindGroup() {
    this.bindGroup = this.renderer.createBindGroup({
      label: this.options.label + ': bind group',
      layout: this.bindGroupLayout,
      entries: this.entries.bindGroup,
    })
  }

  updateBindings() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      if (bindingBuffer.inputBinding && bindingBuffer.inputBinding.shouldUpdate) {
        // bufferOffset is always equals to 0 in our case
        if (!bindingBuffer.inputBinding.useStruct && bindingBuffer.inputBinding.bindingElements.length > 1) {
          // we're in a non struct buffer binding with multiple entries
          // that should not happen but that way we're covered
          this.renderer.queueWriteBuffer(bindingBuffer.buffer, 0, bindingBuffer.array)
        } else {
          this.renderer.queueWriteBuffer(bindingBuffer.buffer, 0, bindingBuffer.inputBinding.value)
        }
      }

      bindingBuffer.inputBinding.shouldUpdate = false
    })
  }

  clone() {
    return this.cloneFromBindingsBuffers()
  }

  cloneFromBindingsBuffers({ bindingsBuffers = [], keepLayout = false } = {}) {
    const params = { ...this.options }
    params.label += ' (copy)'

    const bindGroupCopy = new this.constructor({
      renderer: this.renderer,
      label: params.label,
    })

    bindGroupCopy.setIndex(this.index)

    const bindingsBuffersRef = bindingsBuffers.length ? bindingsBuffers : this.bindingsBuffers

    bindingsBuffersRef.forEach((bindingBuffer, index) => {
      bindGroupCopy.addBinding(bindingBuffer.inputBinding)

      bindGroupCopy.bindingsBuffers.push({ ...bindingBuffer })

      if (!keepLayout) {
        bindGroupCopy.entries.bindGroupLayout.push({
          binding: bindGroupCopy.entries.bindGroupLayout.length,
          buffer: {
            type: getBindGroupLayoutBindingType(bindingBuffer.inputBinding.bindingType),
          },
          visibility: bindingBuffer.inputBinding.visibility,
        })
      }

      bindGroupCopy.entries.bindGroup.push({
        binding: bindGroupCopy.entries.bindGroup.length,
        resource: {
          buffer: bindingBuffer.buffer,
        },
      })
    })

    if (keepLayout) {
      bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout]
    }

    bindGroupCopy.setBindGroupLayout()
    bindGroupCopy.setBindGroup()

    return bindGroupCopy
  }

  destroy() {
    this.bindingsBuffers.forEach((bindingBuffer) => {
      bindingBuffer.buffer?.destroy()
    })

    this.bindingsBuffers = []
    this.bindings = []
  }
}
