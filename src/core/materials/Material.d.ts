import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry, IndexedGeometryIndexData } from '../geometries/IndexedGeometry'
import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import { PipelineEntry } from '../pipelines/PipelineEntry'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { FullShadersType, MeshShadersOptions, MeshShaders } from '../meshes/MeshBaseMixin'
import { RenderTexture } from '../textures/RenderTexture'

interface MaterialGeometryAttribute {
  wgslStructFragment: Geometry['wgslStructFragment']
  vertexArray: Geometry['array']
  verticesCount: Geometry['verticesCount']
  verticesOrder: Geometry['verticesOrder']
  pipelineBuffers: GPUVertexState
}

interface MaterialIndexedGeometryAttribute extends MaterialGeometryAttribute {
  isIndexed: boolean
  indexArray: IndexedGeometryIndexData['array']
  indexBufferFormat: IndexedGeometryIndexData['bufferFormat']
  indexBufferLength: IndexedGeometryIndexData['bufferLength']
}

type MaterialGeometryAttributeBuffersType = 'vertexBuffer' | 'indexBuffer'

export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry

interface MaterialBaseRenderingOptions {
  useProjection: boolean
  transparent: boolean
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  cullMode: GPUCullMode
}

interface MaterialRenderingOptions extends MaterialBaseRenderingOptions {
  verticesOrder: Geometry['verticesOrder']
}

interface MaterialBaseParams extends Partial<MaterialBaseRenderingOptions> {
  label?: string
  shaders?: MeshShadersOptions
  geometry: AllowedGeometries
}

interface MaterialParams extends MaterialBaseParams {
  uniformBindings: Array<BufferBindings>
}

type MaterialBindGroups = Array<BindGroup | TextureBindGroup>
type MaterialGeometryAttributes = MaterialGeometryAttribute | MaterialIndexedGeometryAttribute

interface MaterialAttributes {
  geometry: MaterialGeometryAttributes | null
  buffers: Record<MaterialGeometryAttributeBuffersType, GPUBuffer> | null
}

interface MaterialOptions {
  label: string
  shaders: MeshShadersOptions
  uniformBindings: Array<BufferBindings>
  rendering: MaterialRenderingOptions
}

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: MaterialOptions

  pipelineEntry: PipelineEntry

  attributes: MaterialAttributes

  bindGroups: MaterialBindGroups

  uniforms: Record<string, BufferBindingsUniform>
  uniformsBindGroups: BindGroup[]

  textures: Texture[]
  texturesBindGroup: TextureBindGroup

  constructor(renderer: GPUCurtainsRenderer, parameters: MaterialParams)

  setMaterial()
  setPipelineEntryBuffers()
  get ready(): boolean

  getShaderCode(shaderType: FullShadersType): string
  getAddedShaderCode(shaderType: FullShadersType): string

  setAttributesFromGeometry(geometry: AllowedGeometries)
  createAttributesBuffers()
  destroyAttributeBuffers()

  createBindGroups()
  destroyBindGroups()
  updateBindGroups()

  setUniforms()
  shouldUpdateUniformsBindings(bufferBindingName?: BufferBindings['name'], uniformName?: BufferBindingsUniform['name'])

  setTextures()
  addTexture(texture: Texture | RenderTexture)
  destroyTextures()

  onBeforeRender()
  render(pass: GPURenderPassEncoder)

  destroy()
}
