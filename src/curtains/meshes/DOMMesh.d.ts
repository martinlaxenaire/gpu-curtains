import MeshMixin from '../../core/meshes/MeshMixin'
import { DOMObject3D } from '../objects3D/DOMObject3D'
import { MeshBaseParams } from '../../core/meshes/Mesh'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometry/PlaneGeometry'
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Geometry } from '../../core/geometries/Geometry'

interface DOMMeshParams extends MeshBaseParams {
  geometry: PlaneGeometry | IndexedGeometry | Geometry
}

export class DOMMesh extends MeshMixin(DOMObject3D) {
  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)
}
