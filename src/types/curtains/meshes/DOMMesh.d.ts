// import { DOMObject3D } from '../objects3D/DOMObject3D'
// import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
// import { PlaneGeometry } from '../../core/geometries/PlaneGeometry'
// import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
// import { Geometry } from '../../core/geometries/Geometry'
// import MeshBaseMixin, { MeshBaseParams } from '../../core/meshes/MeshBaseMixin'
// import MeshTransformedMixin from '../../core/meshes/MeshTransformedMixin'
// import { Texture } from '../../core/textures/Texture'
//
// interface DOMMeshBaseParams extends MeshBaseParams {
//   autoloadSources?: boolean
//   watchScroll?: boolean
// }
//
// declare const defaultDOMMeshParams: DOMMeshBaseParams
//
// interface DOMMeshParams extends DOMMeshBaseParams {
//   geometry: PlaneGeometry | IndexedGeometry | Geometry
// }
//
// export class DOMMesh extends MeshTransformedMixin(MeshBaseMixin(DOMObject3D)) {
//   autoloadSources: boolean
//   _sourcesReady: boolean
//
//   _onLoadingCallback: (texture: Texture) => void
//
//   constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)
//
//   get ready(): boolean
//   set ready(value: boolean)
//   get sourcesReady(): boolean
//   set sourcesReady(value: boolean)
//   get DOMMeshReady(): boolean
//
//   addToScene()
//   removeFromScene()
//
//   setInitSources()
//   resetDOMElement(element: string | HTMLElement)
//
//   onLoading: (callback: (texture: Texture) => void) => DOMMesh
// }
