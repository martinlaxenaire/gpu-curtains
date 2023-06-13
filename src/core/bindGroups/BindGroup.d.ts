import { GPURenderer } from '../renderers/GPURenderer'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { BindGroupSamplerBinding } from '../bindGroupBindings/BindGroupSamplerBinding'
import { BindGroupTextureBinding } from '../bindGroupBindings/BindGroupTextureBinding'

type BindGroupBindingElement = BindGroupBufferBindings | BindGroupSamplerBinding | BindGroupTextureBinding

interface BindGroupBindingBuffer {
  uniformBinding: BindGroupBindingElement
  buffer: GPUBuffer
}

interface BindGroupParams {
  label?: string
  renderer: GPURenderer
  index?: number
  bindings: BindGroupBindingElement[]
}

export class BindGroup {
  type: string
  renderer: GPURenderer
  options: {
    label: string
  }
  index: number

  bindings: BindGroupBindingElement[]
  bindingsBuffers: BindGroupBindingBuffer[]

  entries: {
    bindGroupLayout: GPUBindGroupLayoutEntry[]
    bindGroup: GPUBindGroupEntry[]
  }

  bindGroupLayout: null | GPUBindGroupLayout
  bindGroup: null | GPUBindGroup

  needsPipelineFlush: boolean

  constructor({ label, renderer, index, bindings }: BindGroupParams)

  setIndex(index: number)

  setBindings(bindings: BindGroupBindingElement[])
  addBinding(binding: BindGroupBindingElement)

  canCreateBindGroup(): boolean

  resetEntries()

  createBindingBuffer(binding: BindGroupBindingElement)
  createBindingsBuffers()

  setBindGroupLayout()
  setBindGroup()

  updateBindings()

  destroy()
}
