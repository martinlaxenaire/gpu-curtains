import { RenderPassParams } from './RenderPass'

export interface RenderTargetParams extends RenderPassParams {
  label?: string
  depth?: boolean
  loadOp?: GPULoadOp
  clearValue?: GPUColor
}
