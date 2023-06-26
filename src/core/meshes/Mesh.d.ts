import MeshTransformedMixin from './MeshTransformedMixin'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { GPUCameraRenderer } from '../renderers/GPUCameraRenderer'
import MeshBaseMixin, { MeshBaseParams } from './MeshBaseMixin'

export class Mesh extends MeshTransformedMixin(MeshBaseMixin(ProjectedObject3D)) {
  constructor(renderer: GPUCameraRenderer, parameters?: MeshBaseParams)
}
