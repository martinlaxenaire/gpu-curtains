import { BindGroupParams } from './BindGroup'
import { Sampler } from '../../../core/samplers/Sampler'
import { MaterialTexture } from '../materials/Material'

export interface TextureBindGroupParams extends BindGroupParams {
  textures?: MaterialTexture[]
  samplers?: Sampler[]
}
