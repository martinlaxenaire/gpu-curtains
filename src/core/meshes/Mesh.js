import { isCameraRenderer } from '../../utils/renderer-utils'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import MeshTransformedMixin from './MeshTransformedMixin'
import MeshBaseMixin from './MeshBaseMixin'

export class Mesh extends MeshTransformedMixin(MeshBaseMixin(ProjectedObject3D)) {
  constructor(renderer, parameters = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCameraRenderer(renderer, 'Mesh')) {
      console.warn('Mesh fail')
      return
    }

    super(renderer, null, parameters)

    this.type = 'Mesh'
  }
}
