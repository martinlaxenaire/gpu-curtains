// import { Renderer } from '../../utils/renderer-utils'
// import { Sampler } from '../samplers/Sampler'
//import { Texture } from '../textures/Texture'

import { BindGroup } from '../../../core/bindGroups/BindGroup'
import { TextureBindGroup } from '../../../core/bindGroups/TextureBindGroup'
import { BufferBindings } from '../../../core/bindings/BufferBindings'
import { SamplerBindings } from '../../../core/bindings/SamplerBindings'
import { TextureBindings } from '../../../core/bindings/TextureBindings'
import { WorkBufferBindings } from '../../../core/bindings/WorkBufferBindings'
import { Vec2 } from '../../../math/Vec2'
import { Vec3 } from '../../../math/Vec3'
import { Mat4 } from '../../../math/Mat4'
import { AttributeBufferParams } from '../../../utils/buffers-utils'
import { MaterialShadersType } from '../materials/Material'

export type BindGroupBufferBindingElement = BufferBindings | WorkBufferBindings
export type BindGroupBindingElement = BindGroupBufferBindingElement | SamplerBindings | TextureBindings
export type AllowedBindGroups = BindGroup | TextureBindGroup

export type AllowedBindingsTypes = 'uniforms' | 'storages' | 'works'

export interface BindGroupBindingBuffer {
  inputBinding: BindGroupBufferBindingElement
  buffer: GPUBuffer
  resultBuffer?: GPUBuffer // used in WorkBufferBindings
}

export type BindGroupInputs = Record<AllowedBindingsTypes, InputBindings>

export interface BindGroupParams {
  label?: string
  index?: number
  bindings?: BindGroupBindingElement[]
  inputs?: BindGroupInputs
}

export interface BindGroupEntries {
  bindGroupLayout: GPUBindGroupLayoutEntry[]
  bindGroup: GPUBindGroupEntry[]
}

// inputs
export type InputValue = number | Vec2 | Vec3 | Mat4 | Array<number>

export interface InputBase {
  type: AttributeBufferParams['type']
  name?: string
  onBeforeUpdate?: () => void
}

export interface Input extends InputBase {
  value: InputValue
}

export interface InputBindingsParams {
  label?: string
  useStruct?: boolean
  visibility?: MaterialShadersType
  bindings: Record<string, Input>
}

export interface WorkInputBindingsParams extends InputBindingsParams {
  dispatchSize?: number | number[]
}

export type AllowedInputBindingsParams = InputBindingsParams | WorkInputBindingsParams

export type InputBindings = Record<string, AllowedInputBindingsParams>

// export class BindGroup {
//   type: string
//   renderer: Renderer
//   options: {
//     label: string
//     index: number
//     bindings: BindGroupBindingElement[]
//     inputs?: BindGroupInputs
//     textures?: Texture[]
//     samplers?: Sampler[]
//   }
//   index: number
//
//   bindings: BindGroupBindingElement[]
//   bindingsBuffers: BindGroupBindingBuffer[]
//
//   entries: BindGroupEntries
//
//   bindGroupLayout: null | GPUBindGroupLayout
//   bindGroup: null | GPUBindGroup
//
//   needsReset: boolean
//   needsPipelineFlush: boolean
//
//   constructor(renderer: Renderer, { label, index, bindings, inputs }?: BindGroupParams)
//
//   setIndex(index: number)
//
//   setBindings(bindings: BindGroupBindingElement[])
//   addBinding(binding: BindGroupBindingElement)
//
//   createInputBindings(bindingType?: AllowedBindingsTypes, inputs?: InputBindings): BindGroupBindingElement[]
//   setInputBindings()
//
//   get shouldCreateBindGroup(): boolean
//
//   resetEntries()
//   createBindGroup()
//   resetBindGroup()
//
//   getBindingsByName(bindingName?: BufferBindings['name']): BindGroupBindingElement | null
//
//   createBindingBuffer(binding: BindGroupBindingElement)
//   createBindingsBuffers()
//
//   setBindGroupLayout()
//   setBindGroup()
//
//   updateBindings()
//
//   clone(): AllowedBindGroups
//   cloneFromBindingsBuffers({
//     bindingsBuffers,
//     keepLayout,
//   }: {
//     bindingsBuffers?: BindGroupBindingBuffer[]
//     keepLayout?: boolean
//   }): AllowedBindGroups
//
//   destroy()
// }
