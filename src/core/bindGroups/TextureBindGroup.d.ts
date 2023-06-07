import { BindGroup, BindGroupProps } from './BindGroup'
import { Texture } from '../Texture'

interface TextureBindGroupProps extends BindGroupProps {
  textures: Texture[]
}

export class TextureBindGroup extends BindGroup {
  textures: Texture[]
  externalTexturesIDs: Array<number>

  constructor({ label, renderer, index, bindings, textures }: TextureBindGroupProps)

  addTexture(texture: Texture)

  resetTextureBindGroup(textureIndex: number)
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
  updateVideoTextureBindGroupLayout(textureIndex: number)
}
