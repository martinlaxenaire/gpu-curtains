import { GPUCameraRenderer, GPUCameraRendererProps } from '../../core/renderers/GPUCameraRenderer'
import { Texture } from '../../core/Texture'
import { Plane } from '../meshes/Plane'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  planes: Plane[]

  constructor({ container, pixelRatio, renderingScale, camera }: GPUCameraRendererProps)

  onCameraPositionChanged()

  addTexture(texture: Texture)

  onResize()

  onBeginRenderPass(pass: GPURenderPassEncoder)

  render()

  destroy()
}
