import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMTexture } from '../../curtains/textures/DOMTexture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'
import { BufferBinding } from '../bindings/BufferBinding'
import { MediaTexture } from '../textures/MediaTexture'

/**
 * An object defining all possible {@link TextureBindGroup} class instancing parameters
 */
export interface TextureBindGroupParams extends BindGroupParams {
  /** array of {@link MaterialTexture | textures} to add to a {@link TextureBindGroup} */
  textures?: MaterialTexture[]
  /** array of {@link Sampler} to add to a {@link TextureBindGroup} */
  samplers?: Sampler[]
}

/**
 * Used to regroup all {@link types/BindGroups.BindGroupBindingElement | bindings} related to textures (texture, texture matrices buffers and samplers) into one single specific {@link BindGroup}.
 *
 * Also responsible for uploading video textures if needed.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a texture
 * const texture = new Texture(gpuCurtains, {
 *   label: 'Input texture',
 *   name: 'inputTexture',
 * })
 *
 * // create a texture bind group using that texture
 * const textureBindGroup = new TextureBindGroup(gpuCurtains, {
 *   label: 'My texture bind group',
 *   textures: [texture],
 *   uniforms: {
 *     params: {
 *       struct: {
 *         opacity: {
 *           type: 'f32',
 *           value: 1,
 *         },
 *         mousePosition: {
 *           type: 'vec2f',
 *           value: new Vec2(),
 *         },
 *       },
 *     },
 *   },
 * })
 *
 * // create the GPU buffer, bindGroupLayout and bindGroup
 * textureBindGroup.createBindGroup()
 * ```
 */
export class TextureBindGroup extends BindGroup {
  /**
   * Array containing all the {@link MediaTexture} that handle a transformation {@link MediaTexture#modelMatrix | modelMatrix}.
   * @private
   */
  #transformedTextures: MediaTexture[]
  /**
   * A {@link BufferBinding} with all the {@link MediaTexture#modelMatrix | MediaTexture modelMatrix} if any.
   */
  texturesMatricesBinding: BufferBinding | null

  /**
   * TextureBindGroup constructor
   * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
   * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}.
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] }: TextureBindGroupParams = {}
  ) {
    const type = 'TextureBindGroup'

    renderer = isRenderer(renderer, type)

    super(renderer, { label, index, bindings, uniforms, storages })

    this.options = {
      ...this.options,
      // will be filled after
      textures: [],
      samplers: [],
    }

    // add initial textures if any
    if (textures.length) {
      for (const texture of textures) {
        this.addTexture(texture)
      }
    }

    // add initial samplers if any
    if (samplers.length) {
      for (const sampler of samplers) {
        this.addSampler(sampler)
      }
    }

    this.type = type

    this.texturesMatricesBinding = null
  }

  /**
   * Set or reset this {@link TextureBindGroup} {@link TextureBindGroup.renderer | renderer}, and update the {@link samplers} and {@link textures} renderer as well.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    super.setRenderer(renderer)

    if (this.options && this.samplers) {
      this.samplers.forEach((sampler) => {
        sampler.setRenderer(this.renderer)
      })
    }

    if (this.options && this.textures) {
      this.textures.forEach((texture) => {
        // do not update the shadow map renderer texture
        // it will be done in the shadow class if needed
        if (texture.options.type == 'depth' && texture.options.label.includes('Shadow')) return

        texture.setRenderer(this.renderer)
      })
    }
  }

  /**
   * Adds a texture to the {@link textures} array and {@link bindings}.
   * @param texture - texture to add.
   */
  addTexture(texture: MaterialTexture) {
    this.textures.push(texture)
    this.addBindings([...texture.bindings])
  }

  /**
   * Get the current {@link textures} array.
   * @readonly
   */
  get textures(): MaterialTexture[] {
    return this.options.textures
  }

  /**
   * Adds a sampler to the {@link samplers} array and {@link bindings}.
   * @param sampler
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)
    this.addBindings([sampler.binding])
  }

  /**
   * Get the current {@link samplers} array.
   * @readonly
   */
  get samplers(): Sampler[] {
    return this.options.samplers
  }

  /**
   * Get whether the GPU bind group is ready to be created.
   * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all {@link GPUTexture} and {@link GPUSampler} are created.
   * @readonly
   */
  get shouldCreateBindGroup(): boolean {
    return (
      !this.bindGroup &&
      !!this.bindings.length &&
      !this.textures.find((texture) => !(texture.texture || (texture as DOMTexture).externalTexture)) &&
      !this.samplers.find((sampler) => !sampler.sampler)
    )
  }

  /**
   * Set the {@link texturesMatricesBinding} if needed.
   */
  setTexturesMatricesBinding() {
    this.#transformedTextures = this.textures.filter(
      (texture) => (texture instanceof MediaTexture || texture instanceof DOMTexture) && !!texture.transformBinding
    ) as Array<MediaTexture | DOMTexture>

    const texturesBindings = this.#transformedTextures.map((texture) => {
      return texture.transformBinding
    })

    if (texturesBindings.length) {
      const label = 'Textures matrices'
      const name = 'texturesMatrices'

      this.texturesMatricesBinding = new BufferBinding({
        label,
        name,
        childrenBindings: texturesBindings.map((textureBinding) => {
          return {
            binding: textureBinding,
            count: 1,
            forceArray: false,
          }
        }),
      })

      // force texture matrices binding to use original bindings values
      // since they have been actually cloned
      this.texturesMatricesBinding.childrenBindings.forEach((childrenBinding, i) => {
        childrenBinding.inputs.matrix.value = texturesBindings[i].inputs.matrix.value
        // force update for init
        texturesBindings[i].inputs.matrix.shouldUpdate = true
      })

      this.texturesMatricesBinding.buffer.consumers.add(this.uuid)

      const hasMatricesBinding = this.bindings.find((binding) => binding.name === name)

      if (!hasMatricesBinding) {
        this.addBinding(this.texturesMatricesBinding)
      }
    }
  }

  /**
   * Create the {@link texturesMatricesBinding} and {@link bindGroup}.
   */
  createBindGroup() {
    this.setTexturesMatricesBinding()
    super.createBindGroup()
  }

  /**
   * Update the {@link TextureBindGroup#textures | bind group textures}:
   * - Check if they need to copy their source texture.
   * - Upload video texture if needed.
   */
  updateTextures() {
    for (const texture of this.textures) {
      // copy textures that need it on first init, but only when original texture is ready
      if (texture instanceof MediaTexture) {
        if (
          texture.options.fromTexture &&
          texture.options.fromTexture instanceof MediaTexture &&
          texture.options.fromTexture.sourcesUploaded &&
          !texture.sourcesUploaded
        ) {
          texture.copy(texture.options.fromTexture)
        }

        const firstSource = texture.sources.length && texture.sources[0]
        if (
          firstSource &&
          firstSource.shouldUpdate &&
          texture.options.sourcesTypes[0] &&
          texture.options.sourcesTypes[0] === 'externalVideo'
        ) {
          texture.uploadVideoTexture()
        }
      }
    }

    if (this.texturesMatricesBinding) {
      this.#transformedTextures.forEach((texture, i) => {
        this.texturesMatricesBinding.childrenBindings[i].inputs.matrix.shouldUpdate =
          !!texture.transformBinding.inputs.matrix.shouldUpdate

        // reset original flag
        if (texture.transformBinding.inputs.matrix.shouldUpdate) {
          this.renderer.onAfterCommandEncoderSubmission.add(
            () => {
              texture.transformBinding.inputs.matrix.shouldUpdate = false
            },
            { once: true }
          )
        }
      })
    }
  }

  /**
   * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed.
   */
  update() {
    this.updateTextures()
    super.update()
  }

  /**
   * Destroy our {@link TextureBindGroup}.
   */
  destroy() {
    super.destroy()
    this.options.textures = []
    this.options.samplers = []
  }
}
