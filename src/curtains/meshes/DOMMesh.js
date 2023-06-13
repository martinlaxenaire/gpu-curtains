import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { MeshMixin } from '../../core/meshes/MeshMixin'

export class DOMMesh extends MeshMixin(DOMObject3D) {
  constructor(renderer, element, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'DOMMesh')) {
      console.warn('DOMMesh fail')
      return
    }

    super(renderer, element, parameters)

    this.type = 'DOMMesh'
  }
}
