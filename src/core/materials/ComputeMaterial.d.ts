import { AllowedBindingsTypes, AllowedBufferBindings, InputBindings, Material, MaterialOptions } from './Material'
import { BindGroupBindingBuffer, BindGroupBindingElement } from '../bindGroups/BindGroup'
import { BufferBindingsUniform } from '../bindings/BufferBindings'

export class ComputeMaterial extends Material {
  options: MaterialOptions

  works: Record<string, Record<string, BufferBindingsUniform>>

  setPipelineEntryBuffers()

  createInputBindings(bindingType?: AllowedBindingsTypes, inputs?: InputBindings): BindGroupBindingElement[]

  setWorkInputBindings()

  setMaterial()

  get hasMappedBuffer(): boolean

  render(pass: GPUComputePassEncoder)

  copyBufferToResult(commandEncoder: GPUCommandEncoder)
  setWorkGroupsResult()
  setBufferResult(bindingBuffer: BindGroupBindingBuffer)
  getWorkGroupResult({ workGroupName, bindingName }: { workGroupName?: string; bindingName?: string }): Float32Array
}
