import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import { AllowedBindGroups, BindGroup, BindGroupBindingBuffer, BindGroupBindingElement } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { RenderTexture } from '../textures/RenderTexture'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { RenderMaterialRenderingOptions } from './RenderMaterial'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import { AttributeBufferParams } from '../../types/buffers-utils'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

// shaders
export type MaterialShadersType = 'vertex' | 'fragment' | 'compute'
export type FullShadersType = 'full' | MaterialShadersType

export interface ShaderOptions {
  code: string
  entryPoint: string
}

export interface MaterialShaders {
  vertex?: ShaderOptions
  fragment?: ShaderOptions
  compute?: ShaderOptions
}

interface MaterialBaseParams {
  label?: string
  shaders?: MaterialShaders
}

// inputs
export type AllowedBindingsTypes = 'uniforms' | 'storages' | 'works'
export type InputValue = number | Vec2 | Vec3 | Mat4 | Array<number>

interface InputBase {
  type: AttributeBufferParams['type']
  name?: string
  onBeforeUpdate?: () => void
}

interface Input extends InputBase {
  value: InputValue
}

interface InputBindingsParams {
  label?: string
  useStruct?: boolean
  bindings: Record<string, Input>
}

interface WorkInputBindingsParams extends InputBindingsParams {
  dispatchSize?: number | number[]
}

export type InputBindings = Record<string, InputBindingsParams | WorkInputBindingsParams>

type AllowedBufferBindings = BufferBindings | WorkBufferBindings
type MaterialBindGroups = AllowedBindGroups[]

interface MaterialInputBindingsParams {
  uniforms?: Record<string, InputBindingsParams>
  storages?: Record<string, InputBindingsParams>
  works?: Record<string, WorkInputBindingsParams>
  inputBindGroups?: BindGroup[]
}

interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  uniforms?: InputBindings
  storages?: InputBindings
  works?: InputBindings
  inputBindGroups: BindGroup[]
  rendering?: RenderMaterialRenderingOptions
}

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: MaterialOptions

  pipelineEntry: AllowedPipelineEntries

  bindGroups: MaterialBindGroups
  clonedBindGroups: MaterialBindGroups

  uniforms: Record<string, Record<string, BufferBindingsUniform>>
  storages: Record<string, Record<string, BufferBindingsUniform>>
  inputsBindGroups: BindGroup[]
  inputsBindings: BindGroupBindingElement[]

  textures: Texture[]
  texturesBindGroup: TextureBindGroup

  constructor(renderer: GPUCurtainsRenderer, parameters: MaterialParams)

  setMaterial()
  //setPipelineEntryBuffers()
  get ready(): boolean

  getShaderCode(shaderType: FullShadersType): string
  getAddedShaderCode(shaderType: FullShadersType): string

  createBindGroups()
  cloneBindGroupFromBindingsBuffers({
    bindGroup,
    bindingsBuffers,
    keepLayout,
  }: {
    bindGroup?: BindGroup
    bindingsBuffers?: BindGroupBindingBuffer[]
    keepLayout?: boolean
  }): BindGroup | null
  getBindGroupByBindingName(bindingName?: BufferBindings['name']): AllowedBindGroups | null
  destroyBindGroups()
  updateBindGroups()

  createInputBindings(bindingType?: AllowedBindingsTypes, inputs?: InputBindings): BindGroupBindingElement[]

  setInputBindings()
  setBindings()
  shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], uniformName?: BufferBindingsUniform['name'])
  getBindingsByName(bindingName?: BufferBindings['name']): BufferBindings | null
  getBindingsBuffersByBindingName(bindingName?: BufferBindings['name']): BindGroupBindingBuffer[]

  setTextures()
  addTexture(texture: Texture | RenderTexture)
  destroyTextures()

  onBeforeRender()
  render(pass: GPURenderPassEncoder | GPUComputePassEncoder)

  destroy()
}
