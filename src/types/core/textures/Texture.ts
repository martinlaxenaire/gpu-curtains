import { Texture } from '../../../core/textures/Texture'
import { ShaderPass } from '../../../core/renderPasses/ShaderPass'
import { RenderPass } from '../../../core/renderPasses/RenderPass'
import { FullscreenPlane } from '../../../core/meshes/FullscreenPlane'
import { DOMMeshType } from '../../../core/renderers/GPURenderer'

export interface CurtainsTextureOptions {
  generateMips?: boolean
  flipY?: boolean
  format?: GPUTextureFormat
  placeholderColor?: [number, number, number, number]
  useExternalTextures?: boolean
}

export interface TextureBaseParams {
  label?: string
  name?: string
}

export interface TextureDefaultParams extends TextureBaseParams {
  texture?: CurtainsTextureOptions
  fromTexture?: Texture
}

export interface TextureParams extends TextureDefaultParams {
  texture: CurtainsTextureOptions
  fromTexture?: Texture | null
}

export type TextureExternalImageAllowedType = HTMLImageElement | HTMLVideoElement | ImageBitmap | HTMLCanvasElement
export type TextureSource = TextureExternalImageAllowedType | RenderPass | null
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null

export interface TextureOptions extends TextureParams {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

//export type TextureParent = null | Mesh | DOMMesh | Plane | ShaderPass | FullscreenPlane
export type TextureParent = null | DOMMeshType | ShaderPass | FullscreenPlane
