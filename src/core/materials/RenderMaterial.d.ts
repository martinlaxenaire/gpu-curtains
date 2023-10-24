import { Material, MaterialInputBindingsParams, MaterialOptions, MaterialShaders, ShaderOptions } from './Material'
import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry } from '../geometries/IndexedGeometry'
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
interface RenderMaterialAttributes {
  wgslStructFragment: Geometry['wgslStructFragment']
  verticesCount: Geometry['verticesCount']
  instancesCount: Geometry['instancesCount']
  verticesOrder: Geometry['verticesOrder']
  vertexBuffers: Geometry['vertexBuffers']
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

interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {}

interface RenderMaterialParams extends Partial<RenderMaterialBaseParams> {
  label?: string
  shaders?: MaterialShaders
  geometry: AllowedGeometries
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
