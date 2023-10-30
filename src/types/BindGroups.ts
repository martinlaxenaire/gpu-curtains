import { BindGroup } from '../core/bindGroups/BindGroup'
import { TextureBindGroup } from '../core/bindGroups/TextureBindGroup'
import { BufferBindings } from '../core/bindings/BufferBindings'
import { SamplerBindings } from '../core/bindings/SamplerBindings'
import { TextureBindings } from '../core/bindings/TextureBindings'
import { WorkBufferBindings } from '../core/bindings/WorkBufferBindings'
import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { Mat4 } from '../math/Mat4'
import { AttributeBufferParams } from '../utils/buffers-utils'
import { MaterialShadersType } from './Materials'

export type BindGroupBufferBindingElement = BufferBindings | WorkBufferBindings
export type BindGroupBindingElement = BindGroupBufferBindingElement | SamplerBindings | TextureBindings
export type AllowedBindGroups = BindGroup | TextureBindGroup

export type AllowedBindingsTypes = 'uniforms' | 'storages' | 'works'

export interface BindGroupBindingBuffer {
  array: Float32Array
  inputBinding: BindGroupBufferBindingElement
  buffer: GPUBuffer
  resultBuffer?: GPUBuffer // used in WorkBufferBindings
}

//export type BindGroupInputs = Record<AllowedBindingsTypes, InputBindings>
export interface BindGroupInputs {
  uniforms?: InputBindings
  storages?: InputBindings
  works?: InputBindings
}

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
export type InputValue = number | Vec2 | Vec3 | Mat4 | number[]

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
