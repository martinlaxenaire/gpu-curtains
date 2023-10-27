// import { CameraRenderer } from '../../../utils/renderer-utils'
// import { DOMElementBoundingRect, RectCoords } from '../../../core/DOM/DOMElement'
// import { DOMFrustum } from '../../../core/DOM/DOMFrustum'
// import { DOMObject3D } from '../../../curtains/objects3D/DOMObject3D'
// import { ProjectedObject3D } from '../../../core/objects3D/ProjectedObject3D'

//import { MeshBase, MeshBaseParams } from './MeshBaseMixin'

import { RectCoords } from '../../../core/DOM/DOMElement'
import { MeshBaseParams } from './MeshBaseMixin'

export interface TransformedMeshParams {
  frustumCulled?: boolean
  DOMFrustumMargins?: RectCoords
}

export interface TransformedMeshMaterialParameters extends MeshBaseParams {
  frustumCulled: boolean
  DOMFrustumMargins: RectCoords
}

//declare const defaultMeshParams: TransformedMeshParams

// https://stackoverflow.com/questions/65134811/es6-exporting-classes-with-typescript-mixins
// https://www.typescriptlang.org/docs/handbook/mixins.html

//type TransformedMixinConstructor = new (...args: any[]) => DOMObject3D | ProjectedObject3D

// export class MeshTransformedBase {
//   domFrustum: DOMFrustum
//   frustumCulled: boolean
//   DOMFrustumMargins: RectCoords
//
//   // callbacks
//   _onReEnterViewCallback: () => void
//   _onLeaveViewCallback: () => void
//   onReEnterView: (callback: () => void) => MeshTransformedBase
//   onLeaveView: (callback: () => void) => MeshTransformedBase
//
//   constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)
//
//   setMeshMaterial(materialParameters: TransformedMeshMaterialParameters)
//
//   applyScale()
//
//   get projectedBoundingRect(): DOMElementBoundingRect
//
//   updateModelMatrix()
//   updateProjectionMatrixStack()
//
//   //render(pass: GPURenderPassEncoder)
// }
//
// export default function MeshTransformedMixin<TBase extends TransformedMixinConstructor>(
//   superclass: TBase
// ): new (...args: any[]) => InstanceType<TBase> & MeshBase & MeshTransformedBase
