import { CameraRenderer } from '../../types/renderer-utils'
import { BufferBindings } from '../bindings/BufferBindings'
import { Material, MaterialBaseParams, MaterialParams } from '../Material'
import { Texture, TextureBaseParams } from '../Texture'
import { DOMObject3D, RectCoords } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMFrustum } from '../frustum/DOMFrustum'
import { DOMElementBoundingRect } from '../DOMElement'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import { Geometry } from '../geometries/Geometry'
import { IndexedGeometry } from '../geometries/IndexedGeometry'

export type ShadersType = 'vertex' | 'fragment'
export type FullShadersType = 'full' | ShadersType

export interface MeshShaderOption {
  code: string
  entryPoint: string
}

export interface MeshShaders {
  vertex: MeshShaderOption
  fragment: MeshShaderOption
}

export type MeshShadersOptions = Partial<MeshShaders>
export type MeshUniformValue = number | Vec2 | Vec3 | Mat4 | Array<number>

export interface MeshUniformsBase {
  type: CoreBufferParams['type']
  name?: string
  onBeforeUpdate?: () => void
}

export interface MeshUniforms extends MeshUniformsBase {
  value: MeshUniformValue
}

export interface MeshBindings {
  name?: string
  label?: string
  uniforms: Record<string, MeshUniforms>
}

export interface MeshBaseParams extends MaterialBaseParams {
  bindings?: MeshBindings[]
  visible?: boolean
  frustumCulled?: boolean
  DOMFrustumMargins?: RectCoords
  // callbacks
  onReady?: () => void
  onRender?: () => void
  onAfterRender?: () => void
  onReEnterView?: () => void
  onLeaveView?: () => void
  onAfterResize?: () => void
}

export interface MeshParams extends MeshBaseParams {
  // geometry
  geometry: Geometry | IndexedGeometry
}

declare const defaultMeshParams: MeshParams

export class MeshBase {
  type: string
  renderer: CameraRenderer

  options: {
    label: MeshParams['label']
    shaders: MeshParams['shaders']
  }

  matrixUniformBinding: BufferBindings
  uniformsBindings: BufferBindings[]

  material: Material
  geometry: MeshParams['geometry']

  domFrustum: DOMFrustum

  uniforms: Material['uniforms']

  textures: Texture[]

  frustumCulled: boolean
  DOMFrustumMargins: RectCoords
  visible: boolean
  ready: boolean

  // callbacks
  onReady: () => void
  onRender: () => void
  onAfterRender: () => void
  onReEnterView: () => void
  onLeaveView: () => void
  onAfterResize: () => void

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshParams)

  setMaterial(materialParameters: MaterialParams)

  createTexture(options: TextureBaseParams): Texture
  onTextureCreated(texture: Texture)

  setMatricesUniformGroup()
  setUniformBindings(bindings: MeshBindings)

  resize(boundingRect?: DOMElementBoundingRect)
  applyScale()

  get projectedBoundingRect(): DOMElementBoundingRect

  updateModelMatrix()
  updateProjectionMatrixStack()

  render(pass: GPURenderPassEncoder)

  destroy()
}

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://www.typescriptlang.org/docs/handbook/mixins.html

// our mixin constructor (superclass) is either ProjectedObject3D or DOMOBject3D
type MixinConstructor = new (...args: any[]) => DOMObject3D | ProjectedObject3D
// our return constructor is our mixin constructor & MeshBase type (that defines the return of MeshMixin)
type ReturnMixinConstructor = new (...args: any[]) => MixinConstructor extends ProjectedObject3D
  ? ProjectedObject3D & MeshBase
  : DOMObject3D & MeshBase

export default function MeshMixin<TBase extends MixinConstructor>(superclass: TBase): ReturnMixinConstructor
