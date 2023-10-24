import { Renderer } from '../../types/renderer-utils'
import { BindGroup, BindGroupParams } from './BindGroup'
import { Texture } from '../textures/Texture'

interface TextureBindGroupParams extends BindGroupParams {
  textures?: Texture[]
}

export class TextureBindGroup extends BindGroup {
  externalTexturesIDs: Array<number>

  constructor(renderer: Renderer, { label, index, bindings, inputs, textures }?: TextureBindGroupParams)

  addTexture(texture: Texture)
  get textures(): Texture[]

  get shouldCreateBindGroup(): boolean

  resetTextureBindGroup()
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)

  destroy()
}
