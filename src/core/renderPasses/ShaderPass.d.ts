import { FullscreenQuadMesh } from '../meshes/FullscreenQuadMesh'
import { RenderPass, RenderPassParams } from './RenderPass'
import { MeshBaseParams } from '../meshes/MeshBaseMixin'
import { GPURenderer } from '../renderers/GPURenderer'
import { Texture } from '../textures/Texture'

interface ShaderPassParams extends MeshBaseParams, RenderPassParams {}

export class ShaderPass extends FullscreenQuadMesh {
  renderPass: RenderPass
  renderTexture: Texture

  constructor(renderer: GPURenderer, parameters: ShaderPassParams)

  destroy()
}
