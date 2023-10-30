import { toCamelCase } from '../../utils/utils'
import { MaterialShadersType } from '../../types/Materials'
import { TextureBindings } from './TextureBindings'
import { SamplerBindings } from './SamplerBindings'

export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler'
export type TextureSamplerBindings = TextureBindings | SamplerBindings

export interface BindingsParams {
  label?: string
  name?: string
  bindingType?: BindingType
  bindIndex?: number
  visibility?: MaterialShadersType | null
}

/**
 * Bindings class:
 * This one is just a shell to build actual bindings on
 */
export class Bindings {
  label: string
  name: string
  bindingType: BindingType
  bindIndex: number
  visibility: GPUShaderStageFlags
  value?: Float32Array | null

  /**
   * Bindings constructor
   * @param {BindingsParams} parameters - parameters used to create our Bindings
   * @param {string=} parameters.label - binding label
   * @param {string=} parameters.name - binding name
   * @param {BindingType="uniform"} parameters.bindingType - binding type
   * @param {number=} parameters.bindIndex - bind index inside the bind group
   * @param {MaterialShadersType=} parameters.visibility - shader visibility
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType = 'uniform',
    bindIndex = 0,
    visibility,
  }: BindingsParams) {
    this.label = label
    this.name = toCamelCase(name)
    this.bindingType = bindingType
    this.bindIndex = bindIndex

    this.visibility = visibility
      ? (() => {
          switch (visibility) {
            case 'vertex':
              return GPUShaderStage.VERTEX
            case 'fragment':
              return GPUShaderStage.FRAGMENT
            case 'compute':
              return GPUShaderStage.COMPUTE
            default:
              return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
          }
        })()
      : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  }

  /**
   * Set binding WGSL fragment to be appended to the shader's code. Will be overriden.
   */
  // setWGSLFragment() {
  //   /* will be overridden */
  // }

  /**
   * To update our buffers before at each render. Will be overriden.
   */
  onBeforeRender() {
    /* will be overridden */
  }
}
