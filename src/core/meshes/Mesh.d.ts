import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import MeshMixin from './MeshMixin'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry } from '../geometries/IndexedGeometry'
import { GPUCameraRenderer } from '../renderers/GPUCameraRenderer'

type ShadersType = 'vertex' | 'fragment'
type FullShadersType = 'full' | ShadersType

interface MeshShaderOption {
  code: string
  entryPoint: string
}

interface MeshShaders {
  vertex: MeshShaderOption
  fragment: MeshShaderOption
}

type MeshShadersOptions = Partial<MeshShaders>

type MeshUniformValue = number | Vec2 | Vec3 | Mat4 | Array<number>

interface MeshUniformsBase {
  type: CoreBufferProps['type']
  name?: string
  onBeforeUpdate?: () => void
}

interface MeshUniforms extends MeshUniformsBase {
  value: MeshUniformValue
}

interface MeshBindings {
  name?: string
  label?: string
  uniforms: Record<string, MeshUniforms>
}

interface MeshProps {
  label?: string
  shaders?: MeshShadersOptions
  bindings?: MeshBindings
  geometry: Geometry | IndexedGeometry
  onRender?: () => void
}

export class Mesh extends MeshMixin(ProjectedObject3D) {
  constructor(renderer: GPUCameraRenderer, { label, shaders, geometry, bindings, onRender }: MeshProps)
}
