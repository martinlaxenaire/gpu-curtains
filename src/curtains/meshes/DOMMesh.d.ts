import MeshMixin from '../../core/meshes/MeshMixin'
import { DOMObject3D } from '../objects3D/DOMObject3D'
import { MeshBaseParams } from '../../core/meshes/Mesh'
import { GPUCurtainsRenderer } from '../renderer/GPUCurtainsRenderer'
import { PlaneGeometry } from '../geometry/PlaneGeometry'

interface DOMMeshParams extends MeshBaseParams {
  geometry: PlaneGeometry
}

export class DOMMesh extends MeshMixin(DOMObject3D) {
  constructor(renderer: GPUCurtainsRenderer, element: HTMLElement, parameters: DOMMeshParams)
}
