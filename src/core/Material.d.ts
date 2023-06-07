import { Geometry } from './geometries/Geometry'
import { IndexedGeometry, IndexedGeometryIndexData } from './geometries/IndexedGeometry'
import { CurtainsRenderer } from '../utils/renderer-utils'
import { FullShadersType, MeshShaders, MeshShadersOptions } from './meshes/Mesh'
import { BindGroupBufferBindings, BindGroupBufferBindingsUniform } from './bindGroupBindings/BindGroupBufferBindings'
import { PipelineEntry } from './pipelines/PipelineEntry'
import { BindGroup } from './bindGroups/BindGroup'
import { TextureBindGroup } from './bindGroups/TextureBindGroup'
import { Texture } from './Texture'

interface MaterialGeometryAttribute {
  wgslStructFragment: Geometry['wgslStructFragment']
  vertexArray: Geometry['array']
  vertexCount: Geometry['vertexCount']
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

interface MaterialProps {
  label?: string
  shaders: MeshShadersOptions
  uniformBindings: Array<BindGroupBufferBindings>
}

type MaterialBindGroups = Array<BindGroup | TextureBindGroup>
type MaterialGeometryAttributes = Record<string, MaterialGeometryAttribute | MaterialIndexedGeometryAttribute>

export class Material {
  type: string
  renderer: CurtainsRenderer
  options: {
    label: string
    shaders: MeshShaders
    uniformBindings: Array<BindGroupBufferBindings>
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

  // TODO could be curtains as well?,
  constructor(renderer: CurtainsRenderer, { label, shaders, uniformBindings }: MaterialProps)

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
