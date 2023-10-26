// import { TextureBindingResource } from '../bindings/TextureBindings'
// import { Object3D } from '../objects3D/Object3D'
// import { BufferBindings } from '../bindings/BufferBindings'
// import { BindGroupBindingElement } from '../bindGroups/BindGroup'
// import { Vec3 } from '../../math/Vec3'
// import { Mat4 } from '../../math/Mat4'
// import { Renderer } from '../../utils/renderer-utils'
import { Texture } from '../../../core/textures/Texture'
import { Mesh } from '../meshes/Mesh'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { Plane } from '../../curtains/meshes/Plane'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { RenderPass } from '../renderPasses/RenderPass'
import { FullscreenPlane } from '../meshes/FullscreenPlane'

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
  fromTexture: Texture | null
}

export type TextureSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | RenderPass | null
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null

export interface TextureOptions extends TextureParams {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

export type TextureParent = null | Mesh | DOMMesh | Plane | ShaderPass | FullscreenPlane

// declare const defaultTextureParams: TextureParams
//
// export class Texture extends Object3D {
//   type: string
//   renderer: Renderer
//
//   texture: TextureBindingResource
//
//   source: TextureSource
//   size: {
//     width: number
//     height: number
//   }
//
//   options: TextureOptions
//
//   textureMatrix: BufferBindings
//   bindings: Array<BindGroupBindingElement>
//
//   _parent: TextureParent
//
//   _sourceLoaded: boolean
//   _sourceUploaded: boolean
//   shouldUpdate: boolean
//   shouldUpdateBindGroup: boolean
//
//   #planeRatio: Vec3
//   #textureRatio: Vec3
//   #coverScale: Vec3
//   #rotationMatrix: Mat4
//
//   constructor(renderer: Renderer, parameters?: TextureDefaultParams)
//
//   setBindings()
//
//   get parent(): TextureParent
//   set parent(value: TextureParent)
//
//   get sourceLoaded(): boolean
//   set sourceLoaded(value: boolean)
//
//   get sourceUploaded(): boolean
//   set sourceUploaded(value: boolean)
//
//   updateTextureMatrix()
//   resize()
//
//   getNumMipLevels(...sizes: Array<number>): number
//   loadImageBitmap(url: string): Promise<ImageBitmap>
//
//   uploadTexture()
//   uploadVideoTexture()
//
//   copy(texture: Texture)
//   createTexture()
//
//   setSourceSize()
//
//   loadImage(source: string | HTMLImageElement): Promise<void>
//
//   onVideoFrameCallback()
//   onVideoLoaded(video: HTMLVideoElement)
//   loadVideo(source: string | HTMLVideoElement)
//
//   loadCanvas(source: HTMLCanvasElement)
//
//   // callbacks
//   _onSourceLoadedCallback: () => void
//   _onSourceUploadedCallback: () => void
//   onSourceLoaded: (callback: () => void) => Texture
//   onSourceUploaded: (callback: () => void) => Texture
//
//   render()
//
//   destroy()
// }
