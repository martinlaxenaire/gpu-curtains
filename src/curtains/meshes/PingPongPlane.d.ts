import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { RenderTexture } from '../../core/textures/RenderTexture'
import { GPURenderer } from '../../core/renderers/GPURenderer'
import { MeshBaseParams } from '../../core/meshes/MeshBaseMixin'

export class PingPongPlane extends FullscreenPlane {
  renderTarget: RenderTarget

  constructor(renderer: GPURenderer, parameters: MeshBaseParams)

  get renderTexture(): RenderTexture | null

  addToScene()
  removeFromScene()
}
