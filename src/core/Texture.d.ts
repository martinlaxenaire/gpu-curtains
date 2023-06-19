import { TextureBindingResource } from './bindGroupBindings/BindGroupTextureBinding'
import { SamplerBindingResource } from './bindGroupBindings/BindGroupSamplerBinding'
import { Object3D } from './objects3D/Object3D'
import { BindGroupBufferBindings } from './bindGroupBindings/BindGroupBufferBindings'
import { Mesh } from './meshes/Mesh'
import { DOMMesh } from '../curtains/meshes/DOMMesh'
import { BindGroupBindingElement } from './bindGroups/BindGroup'
import { Vec3 } from '../math/Vec3'
import { Mat4 } from '../math/Mat4'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'
import { Plane } from '../curtains/meshes/Plane'

interface CurtainsTextureOptions {
  generateMips?: boolean
  flipY?: boolean
  placeholderColor?: [number, number, number, number]
}

interface TextureBaseParams {
  label?: string
  name?: string
}

interface TextureParams extends TextureBaseParams {
  texture: CurtainsTextureOptions
  sampler: GPUSamplerDescriptor
}

type TextureSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | null
type TextureSourceType = 'image' | 'video' | 'canvas' | null

interface TextureOptions extends TextureParams {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

type TextureParent = null | Mesh | DOMMesh | Plane

declare const defaultTextureParams: TextureParams

export class Texture extends Object3D {
  type: string
  renderer: GPUCurtainsRenderer

  sampler: SamplerBindingResource
  texture: TextureBindingResource

  source: TextureSource
  size: {
    width: number
    height: number
  }

  options: TextureOptions

  textureMatrix: BindGroupBufferBindings
  bindings: Array<BindGroupBindingElement>

  _parent: TextureParent

  sourceLoaded: boolean
  shouldUpdate: boolean
  shouldUpdateBindGroup: boolean

  #planeRatio: Vec3
  #textureRatio: Vec3
  #coverScale: Vec3
  #rotationMatrix: Mat4

  constructor(renderer: GPUCurtainsRenderer, parameters?: TextureParams)

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

  destroy()
}
