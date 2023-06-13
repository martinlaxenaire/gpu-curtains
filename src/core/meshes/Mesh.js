import { isCameraRenderer } from '../../utils/renderer-utils'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { MeshMixin } from './MeshMixin'

export class Mesh extends MeshMixin(ProjectedObject3D) {
  constructor(
    renderer,
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

    if (!isCameraRenderer(renderer, 'Mesh')) {
      console.warn('Mesh fail')
      return
    }

    super(renderer, null, { label, shaders, geometry, bindings, cullMode, onRender })

    this.type = 'Mesh'
  }
}
