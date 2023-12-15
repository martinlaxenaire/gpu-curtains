import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'
import { TextureBinding } from '../bindings/TextureBinding'

/**
 * An object defining all possible {@link TextureBindGroup} class instancing parameters
 */
export interface TextureBindGroupParams extends BindGroupParams {
  /** array of [textures]{@link MaterialTexture} to add to a {@link TextureBindGroup} */
  textures?: MaterialTexture[]
  /** array of {@link Sampler} to add to a {@link TextureBindGroup} */
  samplers?: Sampler[]
}

/**
 * TextureBindGroup class:
 * Used to regroup all [struct]{@link BindGroupBindingElement} related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 * @memberof module:core/bindGroups/TextureBindGroup
 */
export class TextureBindGroup extends BindGroup {
  /**
   * TextureBindGroup constructor
   * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param {TextureBindGroupParams=} parameters - [parameters]{@link TextureBindGroupParams} used to create our {@link TextureBindGroup}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] }: TextureBindGroupParams = {}
  ) {
    const type = 'TextureBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, type)

    super(renderer, { label, index, bindings, uniforms, storages })

    this.options = {
      ...this.options,
      // will be filled after
      textures: [],
      samplers: [],
    }

    // add initial textures if any
    if (textures.length) {
      textures.forEach((texture) => this.addTexture(texture))
    }

    // add initial samplers if any
    if (samplers.length) {
      samplers.forEach((sampler) => this.addSampler(sampler))
    }

    this.type = type
  }

  /**
   * Adds a texture to the textures array and the struct
   * @param texture - texture to add
   */
  addTexture(texture: MaterialTexture) {
    this.textures.push(texture)
    this.addBindings([...texture.bindings])
  }

  /**
   * Get the current textures array
   * @readonly
   */
  get textures(): MaterialTexture[] {
    return this.options.textures
  }

  /**
   * Adds a sampler to the samplers array and the struct
   * @param sampler
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)
    this.addBindings([sampler.binding])
  }

  /**
   * Get the current samplers array
   * @readonly
   */
  get samplers(): Sampler[] {
    return this.options.samplers
  }

  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
   * @readonly
   */
  get shouldCreateBindGroup(): boolean {
    return (
      !this.bindGroup &&
      !!this.bindings.length &&
      !this.textures.find((texture) => !(texture.texture || (texture as Texture).externalTexture)) &&
      !this.samplers.find((sampler) => !sampler.sampler)
    )
  }

  /**
   * Update the [bind group textures]{@link TextureBindGroup#textures}:
   * - Check if they need to copy their source texture
   * - Upload texture if needed
   * - Check if the [bind group layout]{@link TextureBindGroup#bindGroupLayout} and/or [bing group]{@link TextureBindGroup#bindGroup} need an update
   */
  updateTextures() {
    this.textures.forEach((texture, textureIndex) => {
      // copy textures that need it on first init, but only when original texture is ready
      if (texture instanceof Texture) {
        if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
          texture.copy(texture.options.fromTexture)
        }

        if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === 'externalVideo') {
          texture.uploadVideoTexture()
        }
      }
    })
  }

  /**
   * Update the {@link TextureBindGroup}, which means update its [textures]{@link TextureBindGroup#textures}, then update its [buffer struct]{@link TextureBindGroup#bufferBindings} and finally[reset it]{@link TextureBindGroup#resetBindGroup} if needed
   */
  update() {
    this.updateTextures()
    super.update()
  }

  /**
   * Destroy our {@link TextureBindGroup}
   */
  destroy() {
    super.destroy()
    this.options.textures = []
    this.options.samplers = []
  }
}
