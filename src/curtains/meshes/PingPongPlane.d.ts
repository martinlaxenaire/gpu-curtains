import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { RenderTexture } from '../../core/textures/RenderTexture'
import { MeshBaseParams } from '../../core/meshes/MeshBaseMixin'
import { Renderer } from '../../types/renderer-utils'

export class PingPongPlane extends FullscreenPlane {
  renderTarget: RenderTarget

  constructor(renderer: Renderer, parameters: MeshBaseParams)

  get renderTexture(): RenderTexture | null

  addToScene()
  removeFromScene()
}
