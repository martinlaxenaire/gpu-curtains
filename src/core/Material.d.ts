import { Geometry } from './geometries/Geometry'
import { IndexedGeometry, IndexedGeometryIndexData } from './geometries/IndexedGeometry'
import { FullShadersType, MeshShaders, MeshShadersOptions } from './meshes/Mesh'
import { BindGroupBufferBindings, BindGroupBufferBindingsUniform } from './bindGroupBindings/BindGroupBufferBindings'
import { PipelineEntry } from './pipelines/PipelineEntry'
import { BindGroup } from './bindGroups/BindGroup'
import { TextureBindGroup } from './bindGroups/TextureBindGroup'
import { Texture } from './Texture'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

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

interface MaterialBaseParams {
  label?: string
  shaders?: MeshShadersOptions
  transparent?: boolean
  depthWriteEnabled?: boolean
  depthCompare?: GPUCompareFunction
  cullMode?: GPUCullMode
}

interface MaterialParams extends MaterialBaseParams {
  uniformBindings: Array<BindGroupBufferBindings>
}

type MaterialBindGroups = Array<BindGroup | TextureBindGroup>
type MaterialGeometryAttributes = Record<string, MaterialGeometryAttribute | MaterialIndexedGeometryAttribute>

export class Material {
  type: string
  renderer: GPUCurtainsRenderer
  options: {
    label: string
    shaders: MeshShaders
    uniformBindings: Array<BindGroupBufferBindings>
    cullMode: GPUCullMode
  }

  pipelineEntry: PipelineEntry

  attributes: {
    geometry: MaterialGeometryAttributes | null
    buffers: Record<
      MaterialGeometryAttributeBuffersType,
      MaterialGeometryAttributeBuffers | MaterialIndexedGeometryAttributeBuffers
    > | null
  }

  bindGroups: MaterialBindGroups

  uniforms: Record<string, BindGroupBufferBindingsUniform>
  uniformsBindGroups: BindGroup[]

  textures: Texture[]
  texturesBindGroup: TextureBindGroup

  constructor(renderer: GPUCurtainsRenderer, parameters: MaterialParams)

  setMaterial()
  setPipelineEntry()
  getShaderCode(shaderType: FullShadersType): string

  setAttributesFromGeometry(geometry: Geometry | IndexedGeometry)
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
