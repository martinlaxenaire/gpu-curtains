import MeshTransformedMixin from './MeshTransformedMixin'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { CameraRenderer } from '../../utils/renderer-utils'
import MeshBaseMixin, { MeshBaseParams } from './MeshBaseMixin'

export class Mesh extends MeshTransformedMixin(MeshBaseMixin(ProjectedObject3D)) {
  constructor(renderer: CameraRenderer, parameters?: MeshBaseParams)
}
