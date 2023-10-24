import { Renderer } from '../../types/renderer-utils'
import { BindGroupBindingElement } from '../bindGroups/BindGroup'

interface RenderTextureBaseParams {
  label?: string
  name?: string
}

interface RenderTextureDefaultParams extends RenderTextureBaseParams {
  fromTexture?: RenderTexture
}

interface RenderTextureParams extends RenderTextureDefaultParams {
  fromTexture: RenderTexture | null
}

declare const defaultRenderTextureParams: RenderTextureParams

export class RenderTexture {
  renderer: Renderer
  type: string

  texture: GPUTexture

  size: {
    width: number
    height: number
  }

  options: RenderTextureParams

  bindings: Array<BindGroupBindingElement>
  shouldUpdateBindGroup: boolean

  constructor(renderer: Renderer, parameters?: RenderTextureDefaultParams)

  setSourceSize()

  createTexture()

  setBindings()

  resize()

  destroy()
}
