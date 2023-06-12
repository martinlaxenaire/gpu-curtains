import { TextureBindingResource } from './bindGroupBindings/BindGroupTextureBinding'
import { SamplerBindingResource } from './bindGroupBindings/BindGroupSamplerBinding'
import { Object3D } from './objects3D/Object3D'
import { BindGroupBufferBindings } from './bindGroupBindings/BindGroupBufferBindings'
import { Mesh } from './meshes/Mesh'
import { DOMMesh } from '../curtains/meshes/DOMMesh'
import { BindGroupBindingElement } from './bindGroups/BindGroup'
import { Vec3 } from '../math/Vec3'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

interface CurtainsTextureOptions {
  generateMips?: boolean
  flipY?: boolean
  placeholderColor?: Array<number>
}

interface TextureProps {
  label?: string
  name?: string
  texture: CurtainsTextureOptions
  sampler: GPUSamplerDescriptor
}

type TextureSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | null
type TextureSourceType = 'image' | 'video' | 'canvas' | null

interface TextureOptions extends TextureProps {
  source: TextureSource | string // for image url
  sourceType: TextureSourceType
}

type TextureParent = null | Mesh | DOMMesh // TODO

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

  constructor(renderer: GPUCurtainsRenderer, options: TextureProps)

  setBindings()

  get parent(): TextureParent
  set parent(value: TextureParent)

  computeTextureScale()
  updateTextureMatrix()
  resize()

  getNumMipLevels(...sizes: Array<number>): number
  loadImageBitmap(url: string): Promise<ImageBitmap>

  uploadTexture()
  uploadVideoTexture()

  createTexture()
  createSampler()

  setSourceSize()

  loadImage(source: string)

  onVideoFrameCallback()
  loadVideo(source: HTMLVideoElement)

  loadCanvas(source: HTMLCanvasElement)

  destroy()
}
