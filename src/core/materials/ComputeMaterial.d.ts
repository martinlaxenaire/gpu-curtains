import { Material, MaterialOptions } from './Material'
import { BindGroupBindingBuffer } from '../bindGroups/BindGroup'
import { WorkBindGroup } from '../bindGroups/WorkBindGroup'
import { BufferBindingsUniform } from '../bindings/BufferBindings'

export class ComputeMaterial extends Material {
  options: MaterialOptions

  workBindGroups: WorkBindGroup[]
  works: Record<string, BufferBindingsUniform>

  setPipelineEntryBuffers()

  setWorkGroups()

  setMaterial()

  createBindGroups()
  destroyBindGroups()

  get hasMappedBuffer(): boolean

  render(pass: GPUComputePassEncoder)

  copyBufferToResult(commandEncoder: GPUCommandEncoder)
  setWorkGroupsResult()
  setBufferResult(bindingBuffer: BindGroupBindingBuffer)
  getWorkGroupResult(name?: string): Float32Array | null
}
