import { Renderer } from '../../types/renderer-utils'
import { BindGroup, BindGroupParams } from './BindGroup'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'

interface TextureBindGroupParams extends BindGroupParams {
  textures?: Texture[]
  samplers?: Sampler[]
}

export class TextureBindGroup extends BindGroup {
  externalTexturesIDs: Array<number>

  constructor(renderer: Renderer, { label, index, bindings, inputs, textures, samplers }?: TextureBindGroupParams)

  addTexture(texture: Texture)
  get textures(): Texture[]

  addSampler(sampler: Sampler)
  get samplers(): Sampler[]

  get shouldCreateBindGroup(): boolean

  resetTextureBindGroup()
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)

  destroy()
}
