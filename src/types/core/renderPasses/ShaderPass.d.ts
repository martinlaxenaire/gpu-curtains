import { MeshBaseParams } from '../meshes/MeshBaseMixin'
import { RenderTarget } from '../../../core/renderPasses/RenderTarget'

interface ShaderPassParams extends MeshBaseParams {
  renderTarget?: RenderTarget
}
