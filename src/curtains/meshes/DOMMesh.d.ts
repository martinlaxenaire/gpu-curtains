import MeshMixin from '../../core/meshes/MeshMixin'
import { DOMObject3D } from '../objects3D/DOMObject3D'
import { MeshBaseParams } from '../../core/meshes/Mesh'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometry/PlaneGeometry'
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Geometry } from '../../core/geometries/Geometry'

interface DOMMeshBaseParams extends MeshBaseParams {
  autoloadSources?: boolean
}

interface DOMMeshParams extends DOMMeshBaseParams {
  geometry: PlaneGeometry | IndexedGeometry | Geometry
}

export class DOMMesh extends MeshMixin(DOMObject3D) {
  autoloadSources: boolean

  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)

  setInitSources()
}
