import { GPURenderer } from '../renderers/GPURenderer'
import { DOMElementBoundingRect } from '../DOMElement'

interface RenderPassParams {
  label?: string
  depth?: boolean
  loadOp?: GPULoadOp
  clearValue?: GPUColor
}

export class RenderPass {
  renderer: GPURenderer
  type: string
  uuid: string

  options: {
    label: string
    depth: boolean
    loadOp: GPULoadOp
    clearValue: GPUColor
  }

  size: {
    width: number
    height: number
  }

  sampleCount: GPURenderer['sampleCount']

  depthTexture: GPUTexture | undefined
  renderTexture: GPUTexture
  descriptor: GPURenderPassDescriptor

  constructor(renderer: GPURenderer, { label, depth, loadOp }: RenderPassParams)

  createDepthTexture()
  createRenderTexture()

  resetRenderPassDepth()
  resetRenderPassView()

  setRenderPassDescriptor()

  setSize(boundingRect: DOMElementBoundingRect)
  resize(boundingRect: DOMElementBoundingRect)

  setLoadOp(loadOp?: GPULoadOp)

  destroy()
}
