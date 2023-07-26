import { DOMObject3D } from '../objects3D/DOMObject3D'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { PlaneGeometry } from '../../core/geometries/PlaneGeometry'
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Geometry } from '../../core/geometries/Geometry'
import MeshBaseMixin, { MeshBaseParams, MeshBase } from '../../core/meshes/MeshBaseMixin'
import MeshTransformedMixin, { MeshTransformedBase } from '../../core/meshes/MeshTransformedMixin'
import { Texture, TextureBaseParams } from '../../core/textures/Texture'
import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D'

interface DOMMeshBaseParams extends MeshBaseParams {
  autoloadSources?: boolean
  watchScroll?: boolean
}

declare const defaultDOMMeshParams: DOMMeshBaseParams

interface DOMMeshParams extends DOMMeshBaseParams {
  geometry: PlaneGeometry | IndexedGeometry | Geometry
}

export class DOMMesh extends MeshTransformedMixin(MeshBaseMixin(DOMObject3D)) {
  autoloadSources: boolean
  _sourcesReady: boolean

  _onLoadingCallback: (texture: Texture) => void

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)

  get ready(): boolean
  set ready(value: boolean)
  get sourcesReady(): boolean
  set sourcesReady(value: boolean)
  get DOMMeshReady(): boolean

  setInitSources()
  onLoading: (callback: (texture: Texture) => void) => DOMMesh
}
