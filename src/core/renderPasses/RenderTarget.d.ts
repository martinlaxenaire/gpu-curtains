import { Renderer } from '../../types/renderer-utils'
import { RenderPass, RenderPassParams } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { DOMElementBoundingRect } from '../DOMElement'

export class RenderTarget {
  renderer: Renderer
  type: string
  uuid: string

  renderPass: RenderPass
  renderTexture: RenderTexture

  constructor(renderer: Renderer, { label, depth, loadOp }: RenderPassParams)

  addToScene()
  removeFromScene()

  resize(boundingRect: DOMElementBoundingRect)

  remove()
  destroy()
}
