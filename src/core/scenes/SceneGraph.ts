import { Object3D } from '../objects3D/Object3D'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

export class SceneGraph extends Object3D {
  renderer: Renderer
  children: Object3D[]

  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    super()

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'SceneGraph')

    this.renderer = renderer
  }
}
