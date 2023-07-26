import { TextureBindingResource } from '../bindings/TextureBindings'
import { SamplerBindingResource } from '../bindings/SamplerBindings'
import { Object3D } from '../objects3D/Object3D'
import { BufferBindings } from '../bindings/BufferBindings'
import { Mesh } from '../meshes/Mesh'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { BindGroupBindingElement } from '../bindGroups/BindGroup'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import { Plane } from '../../curtains/meshes/Plane'
import { GPURenderer } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { RenderPass } from '../renderPasses/RenderPass'
import { FullscreenPlane } from '../meshes/FullscreenPlane'

interface CurtainsTextureOptions {
  generateMips?: boolean
  flipY?: boolean
  format?: GPUTextureFormat
  placeholderColor?: [number, number, number, number]
  useExternalTextures?: boolean
}

interface TextureBaseParams {
  label?: string
  name?: string
}

interface TextureDefaultParams extends TextureBaseParams {
  texture?: CurtainsTextureOptions
  sampler?: GPUSamplerDescriptor
  fromTexture?: Texture
}

interface TextureParams extends TextureDefaultParams {
  texture: CurtainsTextureOptions
  sampler: GPUSamplerDescriptor
  fromTexture: Texture | null
}

type TextureSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | RenderPass | null
type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null

interface TextureOptions extends TextureParams {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

type TextureParent = null | Mesh | DOMMesh | Plane | ShaderPass | FullscreenPlane

declare const defaultTextureParams: TextureParams

export class Texture extends Object3D {
  type: string
  renderer: GPURenderer

  sampler: SamplerBindingResource
  texture: TextureBindingResource

  source: TextureSource
  size: {
    width: number
    height: number
  }

  options: TextureOptions

  textureMatrix: BufferBindings
  bindings: Array<BindGroupBindingElement>

  _parent: TextureParent

  _sourceLoaded: boolean
  _sourceUploaded: boolean
  shouldUpdate: boolean
  shouldUpdateBindGroup: boolean

  #planeRatio: Vec3
  #textureRatio: Vec3
  #coverScale: Vec3
  #rotationMatrix: Mat4

  constructor(renderer: GPURenderer, parameters?: TextureDefaultParams)

  setBindings()

  get parent(): TextureParent
  set parent(value: TextureParent)

  get sourceLoaded(): boolean
  set sourceLoaded(value: boolean)

  get sourceUploaded(): boolean
  set sourceUploaded(value: boolean)

  updateTextureMatrix()
  resize()

  getNumMipLevels(...sizes: Array<number>): number
  loadImageBitmap(url: string): Promise<ImageBitmap>

  uploadTexture()
  uploadVideoTexture()

  copy(texture: Texture)
  createTexture()
  createSampler()

  setSourceSize()

  loadImage(source: string): Promise<void>

  onVideoFrameCallback()
  loadVideo(source: HTMLVideoElement): Promise<void>

  loadCanvas(source: HTMLCanvasElement)

  // callbacks
  _onSourceLoadedCallback: () => void
  _onSourceUploadedCallback: () => void
  onSourceLoaded: (callback: () => void) => Texture
  onSourceUploaded: (callback: () => void) => Texture

  destroy()
}
