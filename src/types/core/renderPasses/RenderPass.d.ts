// import { Renderer } from '../../utils/renderer-utils'
// import { DOMElementBoundingRect } from '../DOM/DOMElement'

export interface RenderPassParams {
  label?: string
  depth?: boolean
  loadOp?: GPULoadOp
  clearValue?: GPUColor
}

// export class RenderPass {
//   renderer: Renderer
//   type: string
//   uuid: string
//
//   options: {
//     label: string
//     depth: boolean
//     loadOp: GPULoadOp
//     clearValue: GPUColor
//   }
//
//   size: {
//     width: number
//     height: number
//   }
//
//   sampleCount: Renderer['sampleCount']
//
//   depthTexture: GPUTexture | undefined
//   renderTexture: GPUTexture
//   descriptor: GPURenderPassDescriptor
//
//   constructor(renderer: Renderer, { label, depth, loadOp }: RenderPassParams)
//
//   createDepthTexture()
//   createRenderTexture()
//
//   resetRenderPassDepth()
//   resetRenderPassView()
//
//   setRenderPassDescriptor()
//
//   setSize(boundingRect: DOMElementBoundingRect)
//   resize(boundingRect: DOMElementBoundingRect)
//
//   setLoadOp(loadOp?: GPULoadOp)
//
//   destroy()
// }
