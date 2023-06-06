import { Texture } from '../Texture'
import { Material } from '../Material'
import { isCameraRenderer } from '../../utils/renderer-utils'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { MeshMixin } from './MeshMixin'

export class Mesh extends MeshMixin(ProjectedObject3D) {
  constructor(renderer, { label = 'Mesh', shaders = {}, geometry, bindings = [] }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCameraRenderer(renderer, 'Mesh')) {
      console.warn('Mesh fail')
      return
    }

    super(renderer, null, { label, shaders, geometry, bindings })

    this.type = 'Mesh'
  }

  /** Render loop **/

  /**
   *
   * @param pass
   */
  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    super.render(pass)
  }
}
