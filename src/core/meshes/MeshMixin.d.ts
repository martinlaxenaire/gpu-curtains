import { CameraRenderer } from '../../types/renderer-utils'
import { Mesh, MeshBindings, MeshParams } from './Mesh'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { Material, MaterialParams } from '../Material'
import { Texture, TextureBaseParams } from '../Texture'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'

declare const defaultMeshParams: MeshParams

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

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://www.typescriptlang.org/docs/handbook/mixins.html

// our mixin constructor (superclass) is either ProjectedObject3D or DOMOBject3D
type MixinConstructor = new (...args: any[]) => DOMObject3D | ProjectedObject3D
// our return constructor is our mixin constructor & MeshBase type (that defines the return of MeshMixin)
type ReturnMixinConstructor = new (...args: any[]) => MixinConstructor extends ProjectedObject3D
  ? ProjectedObject3D & MeshBase
  : DOMObject3D & MeshBase

export default function MeshMixin<TBase extends MixinConstructor>(superclass: TBase): ReturnMixinConstructor
