import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { MeshBaseParams } from '../meshes/MeshBaseMixin'
import { Renderer } from '../../types/renderer-utils'
import { RenderTexture } from '../textures/RenderTexture'
import { RenderTarget } from './RenderTarget'

interface ShaderPassParams extends MeshBaseParams {
  renderTarget?: RenderTarget
}

export class ShaderPass extends FullscreenPlane {
  renderTarget: RenderTarget | undefined

  constructor(renderer: Renderer, parameters: ShaderPassParams)

  get renderTexture(): RenderTexture | null

  addToScene()
  removeFromScene()
}
