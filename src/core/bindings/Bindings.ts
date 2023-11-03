import { toCamelCase } from '../../utils/utils'
import { MaterialShadersType } from '../../types/Materials'
import { TextureBindings } from './TextureBindings'
import { SamplerBindings } from './SamplerBindings'

/**
 * Defines all kind of binding types
 */
export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler'
/**
 * Defines all kind of {@link Bindings} that are related to textures or samplers
 */
export type TextureSamplerBindings = TextureBindings | SamplerBindings

/**
 * An object defining all possible {@link Bindings} class instancing parameters
 */
export interface BindingsParams {
  /** {@link Bindings} label */
  label?: string
  /** {@link Bindings} name/key */
  name?: string
  /** [bindingType]{@link BindingType} to use with this {@link Bindings} */
  bindingType?: BindingType
  /** binding index inside the [bind group]{@link GPUBindGroup} */
  bindIndex?: number
  /** {@link Bindings} variables shaders visibility */
  visibility?: MaterialShadersType | null
}

/**
 * Bindings class:
 * Used as a shell to build actual bindings upon, like {@link BufferBindings}, {@link WorkBufferBindings}, {@link TextureBindings} and {@link SamplerBindings}
 */
export class Bindings {
  /** The label of the {@link Bindings} */
  label: string
  /** The name/key of the {@link Bindings} */
  name: string
  /** The binding type of the {@link Bindings} */
  bindingType: BindingType
  /** The binding index of the {@link Bindings}, used to link bindings in the shaders */
  bindIndex: number
  /** The visibility of the {@link Bindings} in the shaders */
  visibility: GPUShaderStageFlags
  /** The padded value array that will be sent to the GPUBuffer */
  value?: Float32Array | null

  /**
   * Bindings constructor
   * @param {BindingsParams} parameters - [parameters]{@link BindingsParams} used to create our {@link Bindings}
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
   * To update our buffers before at each render. Will be overriden.
   */
  onBeforeRender() {
    /* will be overridden */
  }
}
