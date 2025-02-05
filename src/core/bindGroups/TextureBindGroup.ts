import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMTexture } from '../textures/DOMTexture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'
import { BufferBinding } from '../bindings/BufferBinding'

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
  #texturesWithMatrices: MaterialTexture[]
  texturesMatricesBinding: BufferBinding | null

  /**
   * TextureBindGroup constructor
   * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}
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
      !this.textures.find((texture) => !(texture.texture || (texture as DOMTexture).externalTexture)) &&
      !this.samplers.find((sampler) => !sampler.sampler)
    )
  }

  setTexturesMatricesBinding() {
    this.#texturesWithMatrices = this.textures.filter((texture) => !!texture.transformBinding)

    const texturesBindings = this.#texturesWithMatrices.map((texture) => {
      return texture.transformBinding
    })

    if (texturesBindings.length) {
      // random label name to avoid duplicates
      const label = 'Textures matrices ' + Math.floor(Math.random() * 9999)
      const baseName = 'texturesMatrices'
      const name = this.index > 1 ? `${baseName}${this.index}` : baseName

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

      const hasMatricesBinding = this.bindings.find((binding) => binding.name === baseName)

      if (!hasMatricesBinding) {
        this.addBinding(this.texturesMatricesBinding)
      }
    }
  }

  createBindGroup() {
    this.setTexturesMatricesBinding()
    super.createBindGroup()
  }

  /**
   * Update the {@link TextureBindGroup#textures | bind group textures}:
   * - Check if they need to copy their source texture
   * - Upload video texture if needed
   */
  updateTextures() {
    for (const texture of this.textures) {
      // copy textures that need it on first init, but only when original texture is ready
      if (texture instanceof DOMTexture) {
        if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
          texture.copy(texture.options.fromTexture)
        }

        if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === 'externalVideo') {
          texture.uploadVideoTexture()
        }
      }
    }

    if (this.texturesMatricesBinding) {
      this.#texturesWithMatrices.forEach((texture, i) => {
        this.texturesMatricesBinding.childrenBindings[i].inputs.matrix.shouldUpdate =
          !!texture.transformBinding.inputs.matrix.shouldUpdate

        // reset original flag
        texture.transformBinding.inputs.matrix.shouldUpdate = false
      })
    }
  }

  /**
   * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed
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
