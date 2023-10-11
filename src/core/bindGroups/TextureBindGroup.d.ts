import { BindGroup, BindGroupParams } from './BindGroup'
import { Texture } from '../textures/Texture'

interface TextureBindGroupParams extends BindGroupParams {
  textures?: Texture[]
}

export class TextureBindGroup extends BindGroup {
  externalTexturesIDs: Array<number>

  constructor({ label, renderer, index, bindings, textures }: TextureBindGroupParams)

  addTexture(texture: Texture)
  get textures(): Texture[]

  get shouldCreateBindGroup(): boolean

  resetTextureBindGroup()
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)

  destroy()
}
