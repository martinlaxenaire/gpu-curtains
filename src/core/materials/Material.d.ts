import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry, IndexedGeometryIndexData } from '../geometries/IndexedGeometry'
import { BufferBindings, BufferBindingsUniform } from '../bindings/BufferBindings'
import { PipelineEntry } from '../pipelines/PipelineEntry'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { GPUCurtainsRenderer } from '../../curtains/renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { FullShadersType, MeshShadersOptions, MeshShaders } from '../meshes/MeshBaseMixin'

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

interface MaterialGeometryAttributeBuffers {
  vertexBuffer: GPUBuffer
}

interface MaterialIndexedGeometryAttributeBuffers extends MaterialGeometryAttributeBuffers {
  indexBuffer: GPUBuffer
}

export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry

interface MaterialBaseParams {
  label?: string
  shaders?: MeshShadersOptions
  transparent?: boolean
  depthWriteEnabled?: boolean
  depthCompare?: GPUCompareFunction
  cullMode?: GPUCullMode

  geometry: AllowedGeometries
}

interface MaterialParams extends MaterialBaseParams {
  uniformBindings: Array<BufferBindings>
}

type MaterialBindGroups = Array<BindGroup | TextureBindGroup>
type MaterialGeometryAttributes = Record<string, MaterialGeometryAttribute | MaterialIndexedGeometryAttribute>

interface MaterialAttributes {
  geometry: MaterialGeometryAttributes | null
  buffers: Record<
    MaterialGeometryAttributeBuffersType,
    MaterialGeometryAttributeBuffers | MaterialIndexedGeometryAttributeBuffers
  > | null
}

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: {
    label: string
    shaders: MeshShaders
    uniformBindings: Array<BufferBindings>
    cullMode: GPUCullMode
  }

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

  setTextures()
  addTextureBinding(texture: Texture)

  render(pass: GPURenderPassEncoder)

  destroy()
}
