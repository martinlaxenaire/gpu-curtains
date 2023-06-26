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
import { FullscreenQuadMesh } from '../meshes/FullscreenQuadMesh'

interface CurtainsTextureOptions {
  generateMips?: boolean
  flipY?: boolean
  format?: GPUTextureFormat
  placeholderColor?: [number, number, number, number]
}

interface TextureBaseParams {
  label?: string
  name?: string
}

interface TextureDefaultParams extends TextureBaseParams {
  texture?: CurtainsTextureOptions
  sampler?: GPUSamplerDescriptor
}

interface TextureParams extends TextureDefaultParams {
  texture: CurtainsTextureOptions
  sampler: GPUSamplerDescriptor
}

type TextureSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | RenderPass | null
type TextureSourceType = 'image' | 'video' | 'canvas' | 'renderPass' | null

interface TextureOptions extends TextureParams {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

type TextureParent = null | Mesh | DOMMesh | Plane | ShaderPass | FullscreenQuadMesh

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

  sourceLoaded: boolean
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

  updateTextureMatrix()
  resize()

  getNumMipLevels(...sizes: Array<number>): number
  loadImageBitmap(url: string): Promise<ImageBitmap>

  uploadTexture()
  uploadVideoTexture()

  createTexture()
  createSampler()

  setSourceSize()

  loadImage(source: string): Promise<void>

  onVideoFrameCallback()
  loadVideo(source: HTMLVideoElement): Promise<void>

  loadCanvas(source: HTMLCanvasElement)

  loadRenderPass(source: RenderPass)

  destroy()
}
