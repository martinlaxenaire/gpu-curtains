import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { MeshMixin } from '../../core/meshes/MeshMixin'

// TODO find a way to avoid code duplication with Mesh class
export class DOMMesh extends MeshMixin(DOMObject3D) {
  constructor(
    renderer,
    element,
    {
      label = 'Mesh',
      geometry,
      shaders = {},
      bindings = [],
      cullMode = 'back',
      onRender = () => {
        /* allow empty callback */
      },
    }
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'DOMMesh')) {
      console.warn('DOMMesh fail')
      return
    }

    super(renderer, element, { label, geometry, shaders, bindings, cullMode, onRender })

    this.type = 'DOMMesh'
  }
}
