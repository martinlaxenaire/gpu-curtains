import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { MeshBaseParams } from '../meshes/MeshBaseMixin'
import { GPURenderer } from '../renderers/GPURenderer'
import { RenderTexture } from '../textures/RenderTexture'

export class ShaderPass extends FullscreenPlane {
  constructor(renderer: GPURenderer, parameters: MeshBaseParams)

  get renderTexture(): RenderTexture | null

  addToScene()
  removeFromScene()
}
