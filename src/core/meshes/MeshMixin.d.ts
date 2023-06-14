import { CameraRenderer } from '../../types/renderer-utils'
import { Mesh, MeshBindings, MeshParams } from './Mesh'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { Material, MaterialParams } from '../Material'
import { Texture, TextureBaseParams } from '../Texture'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'

declare const defaultMeshParams: MeshParams

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://www.typescriptlang.org/docs/handbook/mixins.html

// To get started, we need a type which we'll use to extend
// other classes from. The main responsibility is to declare
// that the type being passed in is a class.

declare class Mesh3D extends ProjectedObject3D {}
declare class DOMMesh3D extends DOMObject3D {}

type PossibleMesh3D = Mesh3D | DOMMesh3D // consumer
type PossibleObject3D = DOMObject3D | ProjectedObject3D

type Constructor = new (...args: any[]) => {}
// type GConstructor<T = {}> = new (...args: any[]) => T
//
// type MixedMeshes = GConstructor<DOMObject3D | ProjectedObject3D>

//declare type Constructor = new (...args: any[]) => PossibleObject3D
//declare type Constructor = new (...args: any[]) => Record<never, unknown>

// https://stackoverflow.com/a/58257148/13354068
//type ReturnConstructor = new (...args: any[]) => Mesh | DOMMesh
//type ReturnConstructor = new (...args: any[]) => DOMObject3D & ProjectedObject3D
//type ReturnConstructor = new (...args: any[]) => PossibleMesh3D
type ReturnConstructor = new (...args: any[]) => Record<never, unknown>

export class MeshBase {
  type: string
  renderer: CameraRenderer

  options: {
    label: MeshParams['label']
    shaders: MeshParams['shaders']
  }

  matrixUniformBinding: BindGroupBufferBindings
  uniformsBindings: BindGroupBufferBindings[]

  material: Material
  geometry: MeshParams['geometry']

  uniforms: Material['uniforms']

  textures: Texture[]

  visible: boolean

  // callbacks
  onRender: () => void

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshParams)

  setMaterial(materialParameters: MaterialParams)

  createTexture(options: TextureBaseParams): Texture
  onTextureCreated(texture: Texture)

  setMatricesUniformGroup()
  setUniformBindings(bindings: MeshBindings)

  resize()
  updateModelMatrix()

  render(pass: GPURenderPassEncoder)

  destroy()
}

export default function MeshMixin<TBase extends Constructor>(superclass: TBase): ReturnConstructor
