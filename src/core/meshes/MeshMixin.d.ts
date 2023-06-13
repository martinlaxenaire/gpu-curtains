import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { CameraRenderer } from '../../utils/renderer-utils'
import { MeshBindings, MeshProps } from './Mesh'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { Material, MaterialProps } from '../Material'
import { Texture, TextureProps } from '../Texture'

// type MeshMixinSuperClass = InstanceType<typeof ProjectedObject3D | typeof DOMObject3D>

// export declare const MeshMixin = (superclass: MeshMixinSuperClass) =>
//   class extends superclass {
//     constructor()
//   }

// const MeshMixinSuperClass = class<ProjectedObject3D | DOMObject3D>
//
// export class MeshMixin extends MeshMixinSuperClass {
//   constructor()
// }

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
type Constructor = new (...args: any[]) => {}

export default function MeshMixin<TBase extends Constructor>(Base: TBase) {
  return class MixedMesh extends Base {
    type: string
    renderer: CameraRenderer

    options: {
      label: MeshProps['label']
      shaders: MeshProps['shaders']
    }

    matrixUniformBinding: BindGroupBufferBindings
    uniformsBindings: BindGroupBufferBindings[]

    material: Material
    geometry: MeshProps['geometry']

    uniforms: Material['uniforms']

    textures: Texture[]

    visible: boolean

    // callbacks
    onRender: () => void

    constructor(
      renderer: CameraRenderer,
      element: HTMLElement | null,
      { label, shaders, geometry, bindings, onRender }: MeshProps
    )

    setMaterial({ label, shaders, cullMode, uniformsBindings }: MaterialProps)

    createTexture(options: TextureProps): Texture
    onTextureCreated(texture: Texture)

    setMatricesUniformGroup()
    setUniformBindings(bindings: MeshBindings)

    resize()
    updateModelMatrix()

    render(pass: GPURenderPassEncoder)

    destroy()
  }
}
