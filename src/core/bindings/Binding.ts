import { toCamelCase } from '../../utils/utils'
import { MaterialShadersType } from '../../types/Materials'
import { TextureBinding } from './TextureBinding'
import { SamplerBinding } from './SamplerBinding'
import { getBindingVisibility } from './utils'

/** Defines all kind of buffer binding types. */
export type BufferBindingType = 'uniform' | 'storage'
/** Defines all kind of texture binding types. */
export type TextureBindingType = 'texture' | 'storage' | 'depth'
/** Defines all kind of DOM texture binding types. */
export type DOMTextureBindingType = 'externalTexture' | TextureBindingType
/** Defines all kind of sampler binding types. */
export type SamplerBindingType = 'sampler'
/** Defines all kind of binding types.  */
export type BindingType = BufferBindingType | DOMTextureBindingType | SamplerBindingType

// see https://www.w3.org/TR/WGSL/#memory-access-mode
/** Defines buffer binding memory access types (read only or read/write). */
export type BufferBindingMemoryAccessType = 'read' | 'read_write'
/** Defines texture binding memory access types (read only, write only or read/write). */
export type BindingMemoryAccessType = BufferBindingMemoryAccessType | 'write'

/**
 * Defines all kind of {@link Binding} that are related to textures or samplers.
 */
export type TextureSamplerBindings = TextureBinding | SamplerBinding

/**
 * An object defining all possible {@link Binding} class instancing parameters.
 */
export interface BindingParams {
  /** {@link Binding} label. */
  label?: string
  /** {@link Binding} name/key. */
  name?: string
  /** {@link BindingType | binding type} to use with this {@link Binding}. */
  bindingType?: BindingType
  /** {@link Binding} variables shaders visibility as an array of {@link MaterialShadersType | shaders types names}. */
  visibility?: MaterialShadersType[]
}

/**
 * Used as a shell to build actual bindings upon, like {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}, {@link core/bindings/WritableBufferBinding.WritableBufferBinding | WritableBufferBinding}, {@link TextureBinding} and {@link SamplerBinding}.
 *
 * Ultimately the goal of a {@link Binding} element is to provide correct resources for {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#entries | GPUBindGroupLayoutEntry} and {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#entries | GPUBindGroupEntry}.
 *
 * ## WGSL
 *
 * Each {@link Binding} creates its own WGSL code snippet variable declaration, using structured types or not.
 */
export class Binding {
  /** The label of the {@link Binding}. */
  label: string
  /** The name/key of the {@link Binding}. */
  name: string
  /** The binding type of the {@link Binding}. */
  bindingType: BindingType
  /** The visibility of the {@link Binding} in the shaders. */
  visibility: GPUShaderStageFlags
  /** Options used to create this {@link Binding}. */
  options: BindingParams

  /** Flag indicating whether we should recreate the parentMesh {@link core/bindGroups/BindGroup.BindGroup#bindGroup | bind group}, usually when a resource has changed. */
  shouldResetBindGroup: boolean
  /** Flag indicating whether we should recreate the parentMesh {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout}, usually when a resource layout has changed. */
  shouldResetBindGroupLayout: boolean

  /** A cache key allowing to get / set bindings from the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#bufferBindings | device manager map cache}. Used for {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} only at the moment. */
  cacheKey: string

  /**
   * Binding constructor
   * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}.
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType = 'uniform',
    visibility = ['vertex', 'fragment', 'compute'],
  }: BindingParams) {
    this.label = label
    this.name = toCamelCase(name)
    this.bindingType = bindingType

    this.visibility = getBindingVisibility(visibility)

    this.options = {
      label,
      name,
      bindingType,
      visibility,
    }

    this.shouldResetBindGroup = false
    this.shouldResetBindGroupLayout = false

    this.cacheKey = `${bindingType},${this.visibility},`
  }
}
