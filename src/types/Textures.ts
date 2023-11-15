import { Texture } from '../core/textures/Texture'
import { ShaderPass } from '../core/renderPasses/ShaderPass'
import { FullscreenPlane } from '../core/meshes/FullscreenPlane'
import { DOMMeshType } from '../core/renderers/GPURenderer'
import { Mesh } from '../core/meshes/Mesh'
import { PingPongPlane } from '../curtains/meshes/PingPongPlane'

/**
 * Parameters used to copy an external image to texture, i.e. that will be uploaded to the GPU using [copyExternalImageToTexture]{@link GPUQueue#copyExternalImageToTexture}
 */
export interface ExternalTextureParams {
  /** Whether to generate mips */
  generateMips?: boolean
  /** Whether to flip the source along the Y axis */
  flipY?: boolean
  /** The [texture format]{@link GPUTextureFormat} to use */
  format?: GPUTextureFormat
  /** Solid color used by temporary texture to display while loading the source */
  placeholderColor?: [number, number, number, number]
  /** Whether video textures should use {@link GPUExternalTexture} or not */
  useExternalTextures?: boolean
}

/**
 * Base parameters used to create a {@link Texture}
 */
export interface TextureBaseParams extends ExternalTextureParams {
  /** The label of the {@link Texture}, used to create various GPU objects for debugging purpose */
  label?: string
  /** Name of the {@link Texture} to use in the [bindings]{@link Binding} */
  name?: string
}

/**
 * Parameters used to create a {@link Texture}
 */
export interface TextureParams extends TextureBaseParams {
  /** Optional {@link Texture} to use as a copy source input */
  fromTexture?: Texture | null
}

/** Allowed [texture]{@link Texture} source to use */
//export type TextureSource = GPUImageCopyExternalImageSource | HTMLImageElement | RenderPass | null
export type TextureSource = GPUImageCopyExternalImageSource | HTMLImageElement | null
/** Allowed [texture]{@link Texture} source type to use */
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null

/**
 * Options used to create this {@link Texture}
 */
export interface TextureOptions extends TextureParams {
  /** {@link Texture} source */
  source: TextureSource | string // for image url
  /** {@link Texture} source type */
  sourceType: TextureSourceType
}

/**
 * Allowed [texture]{@link Texture} parent (can be any type of Mesh)
 */
export type TextureParent = null | Mesh | DOMMeshType | ShaderPass | FullscreenPlane | PingPongPlane
