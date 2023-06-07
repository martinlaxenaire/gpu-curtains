import { GPUCameraRenderer, GPUCameraRendererProps } from '../../core/renderers/GPUCameraRenderer'
import { Texture } from '../../core/Texture'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  planes: any[] // TODO
  textures: Texture[]

  constructor({ container, pixelRatio, renderingScale, camera }: GPUCameraRendererProps)

  setRendererObjects()
  onCameraPositionChanged()

  addTexture(texture: Texture)

  onResize()

  onBeginRenderPass(pass: GPURenderPassEncoder)

  render()

  destroy()
}
