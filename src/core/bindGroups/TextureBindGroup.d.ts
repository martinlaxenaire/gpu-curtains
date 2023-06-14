import { BindGroup, BindGroupParams } from './BindGroup'
import { Texture } from '../Texture'

interface TextureBindGroupParams extends BindGroupParams {
  textures?: Texture[]
}

export class TextureBindGroup extends BindGroup {
  textures: Texture[]
  externalTexturesIDs: Array<number>

  constructor({ label, renderer, index, bindings, textures }: TextureBindGroupParams)

  addTexture(texture: Texture)

  resetTextureBindGroup(textureIndex: number)
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)
}
