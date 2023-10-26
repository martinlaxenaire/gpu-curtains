// import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
// import { Vec2 } from '../../math/Vec2'
// import { Vec3 } from '../../math/Vec3'
// import { Mat4 } from '../../math/Mat4'
// import { AttributeBufferParams } from '../../utils/buffers-utils'
// import { WorkBufferBindings } from '../bindings/WorkBufferBindings'
// import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
// import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
// import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { AllowedBindGroups, BindGroupInputs } from '../bindGroups/BindGroup'
import { BindGroup } from '../../../core/bindGroups/BindGroup'
import { Texture } from '../../../core/textures/Texture'
import { RenderTexture } from '../../../core/textures/RenderTexture'
import { RenderMaterialRenderingOptions } from './RenderMaterial'
import { Sampler } from '../../../core/samplers/Sampler'

// shaders
export type MaterialShadersType = 'vertex' | 'fragment' | 'compute'
export type FullShadersType = 'full' | MaterialShadersType

export interface ShaderOptions {
  code: string
  entryPoint: string
}

export interface MaterialShaders {
  // vertex?: ShaderOptions
  // fragment?: ShaderOptions
  // compute?: ShaderOptions
  [shaderType: MaterialShadersType]: ShaderOptions
}

export interface MaterialBaseParams {
  label?: string
  shaders?: MaterialShaders
  useAsyncPipeline?: boolean
}

// // inputs
//
// export type InputValue = number | Vec2 | Vec3 | Mat4 | Array<number>
//
// interface InputBase {
//   type: AttributeBufferParams['type']
//   name?: string
//   onBeforeUpdate?: () => void
// }
//
// interface Input extends InputBase {
//   value: InputValue
// }
//
// interface InputBindingsParams {
//   label?: string
//   useStruct?: boolean
//   bindings: Record<string, Input>
// }
//
// interface WorkInputBindingsParams extends InputBindingsParams {
//   dispatchSize?: number | number[]
// }
//
// export type InputBindings = Record<string, InputBindingsParams | WorkInputBindingsParams>

//type AllowedBufferBindings = BufferBindings | WorkBufferBindings

type MaterialBindGroups = AllowedBindGroups[]

export interface MaterialInputBindingsParams {
  inputs?: BindGroupInputs
  inputBindGroups?: BindGroup[]
  samplers?: Sampler[]
}

export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

export interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  useAsyncPipeline?: boolean
  inputs?: BindGroupInputs
  inputBindGroups?: BindGroup[]
  samplers?: Sampler[]
  rendering?: RenderMaterialRenderingOptions
}

export type MaterialTexture = Texture | RenderTexture

// export class Material {
//   type: string
//   renderer: GPUCurtainsRenderer
//   options: MaterialOptions
//
//   pipelineEntry: AllowedPipelineEntries
//
//   bindGroups: MaterialBindGroups
//   clonedBindGroups: MaterialBindGroups
//
//   uniforms: Record<string, Record<string, BufferBindingsUniform>>
//   storages: Record<string, Record<string, BufferBindingsUniform>>
//   works: Record<string, Record<string, BufferBindingsUniform>>
//
//   inputsBindGroups: BindGroup[]
//   inputsBindings: BindGroupBindingElement[]
//
//   textures: Texture[]
//   texturesBindGroup: TextureBindGroup
//
//   constructor(renderer: GPUCurtainsRenderer, parameters: MaterialParams)
//
//   setMaterial()
//   //setPipelineEntryBuffers()
//   get ready(): boolean
//
//   getShaderCode(shaderType: FullShadersType): string
//   getAddedShaderCode(shaderType: FullShadersType): string
//
//   setBindGroups()
//   processBindGroupBindings(bindGroup: BindGroup)
//   createBindGroups()
//   cloneBindGroupFromBindingsBuffers({
//     bindGroup,
//     bindingsBuffers,
//     keepLayout,
//   }: {
//     bindGroup?: BindGroup
//     bindingsBuffers?: BindGroupBindingBuffer[]
//     keepLayout?: boolean
//   }): BindGroup | null
//   getBindGroupByBindingName(bindingName?: BufferBindings['name']): AllowedBindGroups | null
//   destroyBindGroups()
//   updateBindGroups()
//
//   shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], bindingName?: BufferBindingsUniform['name'])
//   getBindingsByName(bindingName?: BufferBindings['name']): BufferBindings | null
//   getBindingsBuffersByBindingName(bindingName?: BufferBindings['name']): BindGroupBindingBuffer[]
//
//   setTextures()
//   addTexture(texture: Texture | RenderTexture)
//   destroyTextures()
//
//   setSamplers()
//   addSampler(sampler: Sampler)
//
//   onBeforeRender()
//   render(pass: GPURenderPassEncoder | GPUComputePassEncoder)
//
//   destroy()
// }
