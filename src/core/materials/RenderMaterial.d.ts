import { Material, MaterialOptions, MaterialShaders, ShaderOptions } from './Material'
import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry, IndexedGeometryIndexData } from '../geometries/IndexedGeometry'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { BufferBindings } from '../bindings/BufferBindings'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'

// shaders
export interface RenderShaders {
  vertex: ShaderOptions
  fragment: ShaderOptions
}

export type RenderShadersOptions = Partial<RenderShaders>

// geometry
interface RenderMaterialGeometryAttribute {
  wgslStructFragment: Geometry['wgslStructFragment']
  vertexArray: Geometry['array']
  verticesCount: Geometry['verticesCount']
  verticesOrder: Geometry['verticesOrder']
  pipelineBuffers: GPUVertexState
}

interface RenderMaterialIndexedGeometryAttribute extends RenderMaterialGeometryAttribute {
  isIndexed: boolean
  indexArray: IndexedGeometryIndexData['array']
  indexBufferFormat: IndexedGeometryIndexData['bufferFormat']
  indexBufferLength: IndexedGeometryIndexData['bufferLength']
}

type RenderMaterialGeometryAttributeBuffersType = 'vertexBuffer' | 'indexBuffer'

type RenderMaterialGeometryAttributes = RenderMaterialGeometryAttribute | RenderMaterialIndexedGeometryAttribute

interface RenderMaterialAttributes {
  geometry: RenderMaterialGeometryAttributes | null
  buffers: Record<RenderMaterialGeometryAttributeBuffersType, GPUBuffer> | null
}

export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry

interface RenderMaterialBaseRenderingOptions {
  useProjection: boolean
  transparent: boolean
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  cullMode: GPUCullMode
}

interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
  verticesOrder: Geometry['verticesOrder']
}

interface RenderMaterialBaseParams extends Partial<RenderMaterialBaseRenderingOptions> {
  label?: string
  shaders?: MaterialShaders
  geometry: AllowedGeometries
}

interface RenderMaterialParams extends RenderMaterialBaseParams {
  uniforms?: BufferBindings[]
  storages?: BufferBindings[]
}

export class RenderMaterial extends Material {
  attributes: RenderMaterialAttributes
  options: MaterialOptions

  constructor(renderer: GPUCurtainsRenderer, parameters: RenderMaterialParams)

  setMaterial()
  setPipelineEntryBuffers()
  get ready(): boolean

  setAttributesFromGeometry(geometry: AllowedGeometries)
  createAttributesBuffers()
  destroyAttributeBuffers()

  render(pass: GPURenderPassEncoder)

  destroy()
}
