import { GPURenderer } from '../renderers/GPURenderer'
import { RenderPass, RenderPassParams } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { DOMElementBoundingRect } from '../DOMElement'

export class RenderTarget {
  renderer: GPURenderer
  type: string
  uuid: string

  renderPass: RenderPass
  renderTexture: RenderTexture

  constructor(renderer: GPURenderer, { label, depth, loadOp }: RenderPassParams)

  addToScene()
  removeFromScene()

  resize(boundingRect: DOMElementBoundingRect)

  remove()
  destroy()
}
