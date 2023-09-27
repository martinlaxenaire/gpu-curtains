import { GPURenderer } from '../renderers/GPURenderer'
import { BufferBindings } from '../bindings/BufferBindings'
import { SamplerBindings } from '../bindings/SamplerBindings'
import { TextureBindings } from '../bindings/TextureBindings'
import { WorkBindings } from '../bindings/WorkBindings'

type BindGroupBindingElement = BufferBindings | SamplerBindings | TextureBindings | WorkBindings

interface BindGroupBindingBuffer {
  uniformBinding: BindGroupBindingElement
  buffer: GPUBuffer
  resultBuffer?: GPUBuffer // used for WorkBindGroup
}

interface BindGroupParams {
  label?: string
  renderer: GPURenderer
  index?: number
  bindings?: BindGroupBindingElement[]
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

  needsReset: boolean
  needsPipelineFlush: boolean

  constructor({ label, renderer, index, bindings }: BindGroupParams)

  setIndex(index: number)

  setBindings(bindings: BindGroupBindingElement[])
  addBinding(binding: BindGroupBindingElement)

  get shouldCreateBindGroup(): boolean

  resetEntries()
  createBindGroup()
  resetBindGroup()

  createBindingBuffer(binding: BindGroupBindingElement)
  createBindingsBuffers()

  setBindGroupLayout()
  setBindGroup()

  updateBindings()

  destroy()
}
