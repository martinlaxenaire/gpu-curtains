import { Material, MaterialOptions } from './Material'
import { BindGroupBindingBuffer } from '../bindGroups/BindGroup'
import { WorkBindGroup } from '../bindGroups/WorkBindGroup'

export class ComputeMaterial extends Material {
  options: MaterialOptions

  workBindGroups: WorkBindGroup[]

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
