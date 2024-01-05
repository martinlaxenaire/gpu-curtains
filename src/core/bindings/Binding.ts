import { toCamelCase } from '../../utils/utils'
import { MaterialShadersType } from '../../types/Materials'
import { TextureBinding } from './TextureBinding'
import { SamplerBinding } from './SamplerBinding'

/** Defines all kind of texture binding types */
export type TextureBindingType = 'texture' | 'externalTexture' | 'storageTexture'
/** Defines all kind of binding types  */
export type BindingType = 'uniform' | 'storage' | TextureBindingType | 'sampler'

// see https://www.w3.org/TR/WGSL/#memory-access-mode
/** Defines buffer binding memory access types (read only or read/write) */
export type BufferBindingMemoryAccessType = 'read' | 'read_write'
/** Defines texture binding memory access types (read only, write only or read/write) */
export type BindingMemoryAccessType = BufferBindingMemoryAccessType | 'write'

/**
 * Defines all kind of {@link Binding} that are related to textures or samplers
 */
export type TextureSamplerBindings = TextureBinding | SamplerBinding

/**
 * An object defining all possible {@link Binding} class instancing parameters
 */
export interface BindingParams {
  /** {@link Binding} label */
  label?: string
  /** {@link Binding} name/key */
  name?: string
  /** [bindingType]{@link BindingType} to use with this {@link Binding} */
  bindingType?: BindingType
  /** {@link Binding} variables shaders visibility */
  visibility?: MaterialShadersType | null
}

/**
 * Binding class:
 * Used as a shell to build actual binding upon, like {@link BufferBinding}, {@link WritableBufferBinding}, {@link TextureBinding} and {@link SamplerBinding}.
 * Ultimately the goal of a {@link Binding} element is to provide correct resources for {@link GPUBindGroupLayoutEntry} and {@link GPUBindGroupEntry}
 */
export class Binding {
  /** The label of the {@link Binding} */
  label: string
  /** The name/key of the {@link Binding} */
  name: string
  /** The binding type of the {@link Binding} */
  bindingType: BindingType
  /** The visibility of the {@link Binding} in the shaders */
  visibility: GPUShaderStageFlags
  /** Options used to create this {@link Binding} */
  options: BindingParams

  /** Flag indicating whether we should recreate the parent {@link BindGroup#bindGroup | bind group}, usually when a resource has changed */
  shouldResetBindGroup: boolean
  /** Flag indicating whether we should recreate the parent [bind group layout]{@link BindGroup#bindGroupLayout}, usually when a resource layout has changed */
  shouldResetBindGroupLayout: boolean

  /**
   * Binding constructor
   * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}
   */
  constructor({ label = 'Uniform', name = 'uniform', bindingType = 'uniform', visibility }: BindingParams) {
    this.label = label
    this.name = toCamelCase(name)
    this.bindingType = bindingType

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

    this.options = {
      label,
      name,
      bindingType,
      visibility,
    }

    this.shouldResetBindGroup = false
    this.shouldResetBindGroupLayout = false
  }
}
