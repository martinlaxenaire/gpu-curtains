// import { Renderer } from '../../utils/renderer-utils'
// import { BindGroup, BindGroupParams } from './BindGroup'
import { BindGroupParams } from './BindGroup'
import { Texture } from '../../../core/textures/Texture'
import { Sampler } from '../../../core/samplers/Sampler'
import { MaterialTexture } from '../materials/Material'

export interface TextureBindGroupParams extends BindGroupParams {
  textures?: MaterialTexture[]
  samplers?: Sampler[]
}

// export class TextureBindGroup extends BindGroup {
//   externalTexturesIDs: Array<number>
//
//   constructor(renderer: Renderer, { label, index, bindings, inputs, textures, samplers }?: TextureBindGroupParams)
//
//   addTexture(texture: Texture)
//   get textures(): Texture[]
//
//   addSampler(sampler: Sampler)
//   get samplers(): Sampler[]
//
//   get shouldCreateBindGroup(): boolean
//
//   resetTextureBindGroup()
//   shouldUpdateVideoTextureBindGroupLayout(textureIndex: number)
//   updateVideoTextureBindGroupLayout(textureIndex: number)
//
//   destroy()
// }
