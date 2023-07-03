import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { MeshBaseParams } from '../meshes/MeshBaseMixin'
import { GPURenderer } from '../renderers/GPURenderer'
import { Texture } from '../textures/Texture'
import { DOMElementBoundingRect } from '../DOMElement'
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture'

export class ShaderPass extends FullscreenPlane {
  renderTextures: RenderTexture[]

  constructor(renderer: GPURenderer, parameters: MeshBaseParams)

  createRenderTexture(options: RenderTextureParams): RenderTexture
  get renderTexture(): RenderTexture | null

  resize(boundingRect: DOMElementBoundingRect)

  addToScene()
  removeFromScene()
}
