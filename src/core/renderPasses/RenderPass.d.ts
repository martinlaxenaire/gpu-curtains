import { GPURenderer } from '../renderers/GPURenderer'
import { DOMElementBoundingRect } from '../DOMElement'

interface RenderPassParams {
  renderer: GPURenderer
  label?: string
  depth?: boolean
}

export class RenderPass {
  renderer: GPURenderer

  options: {
    label: string
    depth: boolean
  }

  size: {
    width: number
    height: number
  }

  sampleCount: GPURenderer['sampleCount']

  depthTexture: GPUTexture | undefined
  renderTexture: GPUTexture
  descriptor: GPURenderPassDescriptor

  constructor({ renderer, label, depth }: RenderPassParams)

  createDepthTexture()
  createRenderTexture()

  resetRenderPassDepth()
  resetRenderPassView()

  setRenderPassDescriptor()

  setSize(boundingRect: DOMElementBoundingRect)
  resize(boundingRect: DOMElementBoundingRect)

  destroy()
}
