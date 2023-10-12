import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import { AllowedBindGroups, BindGroup, BindGroupBindingElement } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { RenderTexture } from '../textures/RenderTexture'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { RenderMaterialRenderingOptions } from './RenderMaterial'
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

interface MaterialParams extends MaterialBaseParams {
  uniforms: BufferBindings[]
  storages: BufferBindings[]
}

type MaterialBindGroups = AllowedBindGroups[]

interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  uniforms?: BufferBindings[]
  storages?: BufferBindings[]
  works?: WorkBufferBindings[]
  rendering?: RenderMaterialRenderingOptions
}

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: MaterialOptions

  pipelineEntry: AllowedPipelineEntries

  bindGroups: MaterialBindGroups
  clonedBindGroups: MaterialBindGroups

  uniforms: Record<string, BufferBindingsUniform>
  storages: Record<string, BufferBindingsUniform>
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
  // cloneBindGroupAtIndex(index?: number): AllowedBindGroups | null
  // swapBindGroupsAtIndex(index?: number)
  getBindGroupByBindingName(bindingName?: BufferBindings['name']): AllowedBindGroups | null
  destroyBindGroups()
  updateBindGroups()

  setBindings()
  shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], uniformName?: BufferBindingsUniform['name'])
  getBindingsBuffersByBindingName(bindingName?: BufferBindings['name']): BufferBindingsUniform[]

  setTextures()
  addTexture(texture: Texture | RenderTexture)
  destroyTextures()

  onBeforeRender()
  render(pass: GPURenderPassEncoder | GPUComputePassEncoder)

  destroy()
}
