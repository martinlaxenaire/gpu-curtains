import { BindGroup, BindGroupParams } from './BindGroup'
import { Texture } from '../textures/Texture'

interface TextureBindGroupParams extends BindGroupParams {
  textures?: Texture[]
}

export class TextureBindGroup extends BindGroup {
  textures: Texture[]
  externalTexturesIDs: Array<number>

  constructor({ label, renderer, index, bindings, textures }: TextureBindGroupParams)

  addTexture(texture: Texture)

  get shouldCreateBindGroup(): boolean

  resetTextureBindGroup(textureIndex: number)
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)
}
