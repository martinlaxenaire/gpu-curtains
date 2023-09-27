import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { RenderTexture } from '../textures/RenderTexture'
import { AllowedPipelineEntries } from '../pipelines/PipelineManager'
import { WorkBindGroup } from '../bindGroups/WorkBindGroup'
import { WorkBindings } from '../bindings/WorkBindings'
import { RenderMaterialRenderingOptions } from './RenderMaterial'

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

type MaterialBindGroups = Array<BindGroup | TextureBindGroup | WorkBindGroup>

interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  uniforms?: BufferBindings[]
  storages?: BufferBindings[]
  workBindings?: Array<WorkBindings>
  rendering?: RenderMaterialRenderingOptions
}

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: MaterialOptions

  pipelineEntry: AllowedPipelineEntries

  bindGroups: MaterialBindGroups

  uniforms: Record<string, BufferBindingsUniform>
  storages: Record<string, BufferBindingsUniform>
  inputsBindGroups: BindGroup[]
  inputsBindings: BufferBindings[]

  textures: Texture[]
  texturesBindGroup: TextureBindGroup

  constructor(renderer: GPUCurtainsRenderer, parameters: MaterialParams)

  setMaterial()
  //setPipelineEntryBuffers()
  get ready(): boolean

  getShaderCode(shaderType: FullShadersType): string
  getAddedShaderCode(shaderType: FullShadersType): string

  createBindGroups()
  destroyBindGroups()
  updateBindGroups()

  setBindings()
  shouldUpdateInputsBindings(bufferBindingName?: BufferBindings['name'], uniformName?: BufferBindingsUniform['name'])

  setTextures()
  addTexture(texture: Texture | RenderTexture)
  destroyTextures()

  onBeforeRender()
  render(pass: GPURenderPassEncoder | GPUComputePassEncoder)

  destroy()
}
