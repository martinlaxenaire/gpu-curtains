import { Renderer } from '../../utils/renderer-utils'
import { RenderPass, RenderPassParams } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { DOMElementBoundingRect } from '../DOM/DOMElement'

export interface RenderTargetParams extends RenderPassParams {
  label?: string
  depth?: boolean
  loadOp?: GPULoadOp
  clearValue?: GPUColor
}

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
