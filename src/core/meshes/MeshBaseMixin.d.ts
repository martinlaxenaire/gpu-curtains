import { CameraRenderer } from '../../types/renderer-utils'
import { BufferBindings } from '../bindings/BufferBindings'
import { Material, MaterialBaseParams, MaterialParams } from '../materials/Material'
import { Texture, TextureBaseParams, TextureDefaultParams } from '../textures/Texture'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMElementBoundingRect } from '../DOMElement'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'

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

export interface MeshMaterialParameters extends MaterialParams {
  bindings?: MeshBindings[]
}

export interface MeshBaseParams extends MaterialBaseParams {
  bindings?: MeshBindings[]
  visible?: boolean
  renderOrder?: number
  // callbacks
  onReady?: () => void
  onRender?: () => void
  onAfterRender?: () => void
  onAfterResize?: () => void
}

declare let meshIndex: number

declare const defaultMeshBaseParams: MeshBaseParams

export class MeshBase {
  type: string
  readonly uuid: string
  readonly index: number
  renderer: CameraRenderer

  options: {
    label: MeshBaseParams['label']
    shaders: MeshBaseParams['shaders']
  }

  uniformsBindings: BufferBindings[]

  material: Material
  geometry: MeshBaseParams['geometry']

  uniforms: Material['uniforms']

  textures: Texture[]

  renderOrder: number
  transparent: boolean

  visible: boolean
  ready: boolean

  // callbacks
  onReady: () => void
  onRender: () => void
  onAfterRender: () => void
  onAfterResize: () => void

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  setMeshMaterial(meshParameters: MeshMaterialParameters)

  setMaterial(materialParameters: MaterialParams)

  createTexture(options: TextureDefaultParams): Texture
  onTextureCreated(texture: Texture)

  setUniformBindings(bindings: MeshBindings)

  resize(boundingRect?: DOMElementBoundingRect)

  onBeforeRenderPass()
  onRenderPass(pass: GPURenderPassEncoder)
  onAfterRenderPass()
  render(pass: GPURenderPassEncoder)

  remove()
  destroy()
}

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://stackoverflow.com/questions/58256383/using-javascript-class-mixins-with-typescript-declaration-files
// https://www.typescriptlang.org/docs/handbook/mixins.html

declare class EmptyClass {}
export type MixinConstructor = new (...args: any[]) => DOMObject3D | ProjectedObject3D | EmptyClass

export default function MeshBaseMixin<TBase extends MixinConstructor>(
  superclass: TBase
): new (...args: any[]) => MeshBase & InstanceType<TBase>
