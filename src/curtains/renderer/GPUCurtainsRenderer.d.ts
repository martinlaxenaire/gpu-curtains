import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { Texture } from '../../core/Texture'
import { Plane } from '../meshes/Plane'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  //planes: (typeof Plane)[]
  planes: Plane[]

  constructor({ container, pixelRatio, renderingScale, camera }: GPUCameraRendererParams)

  onCameraPositionChanged()

  addTexture(texture: Texture)

  onResize()

  //onBeginRenderPass(pass: GPURenderPassEncoder)

  render()

  destroy()
}
