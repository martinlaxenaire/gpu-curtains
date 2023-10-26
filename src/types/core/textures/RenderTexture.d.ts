import { RenderTexture } from '../../../core/textures/RenderTexture'

export interface RenderTextureBaseParams {
  label?: string
  name?: string
}

export interface RenderTextureDefaultParams extends RenderTextureBaseParams {
  fromTexture?: RenderTexture
}

export interface RenderTextureParams extends RenderTextureDefaultParams {
  fromTexture: RenderTexture | null
}
