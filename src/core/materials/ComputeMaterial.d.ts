import { Material, MaterialOptions } from './Material'
import { BindGroupBindingBuffer } from '../bindGroups/BindGroup'
import { BufferBindingsUniform } from '../bindings/BufferBindings'

export class ComputeMaterial extends Material {
  options: MaterialOptions

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
  getWorkGroupResult({ workGroupName, bindingName }: { workGroupName?: string; bindingName?: string }): Float32Array
}
