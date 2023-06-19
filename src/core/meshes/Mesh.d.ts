import MeshMixin, { MeshParams } from './MeshMixin'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { GPUCameraRenderer } from '../renderers/GPUCameraRenderer'

export class Mesh extends MeshMixin(ProjectedObject3D) {
  constructor(renderer: GPUCameraRenderer, parameters?: MeshParams)
}
