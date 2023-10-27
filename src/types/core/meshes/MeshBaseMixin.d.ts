import { CameraRenderer } from '../../../utils/renderer-utils'
import { Material } from '../../../core/materials/Material'
import { RenderMaterial } from '../../../core/materials/RenderMaterial'
import { RenderTarget } from '../../../core/renderPasses/RenderTarget'
import { DOMObject3D } from '../../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../../../core/objects3D/ProjectedObject3D'
import { DOMElementBoundingRect } from '../../../core/DOM/DOMElement'
import { Texture } from '../../../core/textures/Texture'
import { RenderTexture } from '../../../core/textures/RenderTexture'

import { RenderMaterialBaseParams, RenderMaterialParams } from '../materials/RenderMaterial'
import { CurtainsTextureOptions, TextureDefaultParams } from '../textures/Texture'
import { RenderTextureParams } from '../textures/RenderTexture'

export interface MeshBaseParams extends RenderMaterialParams {
  autoAddToScene: boolean
  visible?: boolean
  renderOrder?: number
  renderTarget?: RenderTarget
  texturesOptions?: CurtainsTextureOptions
}

export interface MeshBaseOptions {
  label?: MeshBaseParams['label']
  shaders: MeshBaseParams['shaders']
  texturesOptions?: CurtainsTextureOptions
  renderTarget?: RenderTarget | null
  autoAddToScene?: boolean
  useAsyncPipeline?: boolean
}

declare let meshIndex: number

declare const defaultMeshBaseParams: MeshBaseParams

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://stackoverflow.com/questions/58256383/using-javascript-class-mixins-with-typescript-declaration-files
// https://www.typescriptlang.org/docs/handbook/mixins.html

declare class EmptyClass {}
export type MixinConstructor = new (...args: any[]) => DOMObject3D | ProjectedObject3D | EmptyClass

// export class MeshBase {
//   #autoAddToScene: boolean
//   type: string
//   readonly uuid: string
//   readonly index: number
//   renderer: CameraRenderer
//
//   options: {
//     label: MeshBaseParams['label']
//     shaders: MeshBaseParams['shaders']
//     texturesOptions: CurtainsTextureOptions
//   }
//
//   material: RenderMaterial
//   geometry: MeshBaseParams['geometry']
//
//   renderTextures: RenderTexture[]
//   textures: Texture[]
//
//   renderTarget: null | RenderTarget
//
//   renderOrder: number
//   transparent: boolean
//
//   visible: boolean
//   _ready: boolean
//
//   // callbacks
//   _onReadyCallback: () => void
//   _onBeforeRenderCallback: () => void
//   _onRenderCallback: () => void
//   _onAfterRenderCallback: () => void
//   _onAfterResizeCallback: () => void
//   onReady: (callback: () => void) => MeshBase
//   onBeforeRender: (callback: () => void) => MeshBase
//   onRender: (callback: () => void) => MeshBase
//   onAfterRender: (callback: () => void) => MeshBase
//   onAfterResize: (callback: () => void) => MeshBase
//
//   constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)
//
//   get autoAddToScene(): boolean // allow to read value from child classes
//
//   get ready(): boolean
//   set ready(value: boolean)
//
//   setMeshMaterial(meshParameters: RenderMaterialBaseParams)
//
//   setMaterial(materialParameters: RenderMaterialParams)
//
//   addToScene()
//   removeFromScene()
//
//   createTexture(options: TextureDefaultParams): Texture
//   onTextureCreated(texture: Texture)
//   createRenderTexture(options: RenderTextureParams): RenderTexture
//
//   setRenderTarget(renderTarget: RenderTarget | null)
//
//   get uniforms(): Material['uniforms']
//   get storages(): Material['storages']
//
//   resize(boundingRect?: DOMElementBoundingRect)
//
//   onBeforeRenderPass()
//   onRenderPass(pass: GPURenderPassEncoder)
//   onAfterRenderPass()
//   render(pass: GPURenderPassEncoder)
//
//   remove()
//   destroy()
// }
//
// export default function MeshBaseMixin<TBase extends MixinConstructor>(
//   superclass: TBase
// ): new (...args: any[]) => MeshBase & InstanceType<TBase>
