import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'
import { TextureBindings } from '../bindings/TextureBindings'

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
 * Used to regroup all [bindings]{@link BindGroupBindingElement} related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 */
export class TextureBindGroup extends BindGroup {
  /** An array containing all the already created external textures ID */
  externalTexturesIDs: number[]

  /**
   * TextureBindGroup constructor
   * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param {TextureBindGroupParams=} parameters - [parameters]{@link TextureBindGroupParams} used to create our {@link TextureBindGroup}
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label, index = 0, bindings = [], inputs, textures = [], samplers = [] }: TextureBindGroupParams = {}
  ) {
    const type = 'TextureBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, type)

    super(renderer, { label, index, bindings, inputs })

    //this.options.textures = textures
    this.options = {
      ...this.options,
      textures,
      samplers,
    }

    this.type = type

    // keep track of external textures to know when to flush
    this.externalTexturesIDs = []
  }

  /**
   * Adds a texture to the textures array and the bindings
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
   * Adds a sampler to the samplers array and the bindings
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
   * Reset our {@link TextureBindGroup}, first by reassigning correct {@link BindGroup#entries} resources, then by recreating the GPUBindGroup.
   * Called each time a GPUTexture or GPUExternalTexture has changed:
   * - A texture media has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
   * - GPUExternalTexture at each tick
   * - A render texture GPUTexture has changed (on resize)
   */
  resetTextureBindGroup() {
    // find the indexes of all texture bindings
    const textureBindingsIndexes = [...this.bindings].reduce(
      (foundIndexes, binding, index) => (binding instanceof TextureBindings && foundIndexes.push(index), foundIndexes),
      []
    )

    // now update the entries bindGroup array resources if needed
    if (textureBindingsIndexes.length) {
      textureBindingsIndexes.forEach((index) => {
        this.entries.bindGroup[index].resource = this.bindings[index].resource
      })

      this.setBindGroup()
    }
  }

  /**
   * Get whether we should update our video [bind group layout]{@link GPUBindGroupLayout}.
   * Happens when a GPUExternalTexture is created, we need to rebuild the {@link BindGroup#bindGroup} and {@link BindGroup#bindGroupLayout} from scratch. We might even need to recreate the whole pipeline (it it has already been created).
   * @param textureIndex - the texture index in the bind group textures array
   * @returns - whether we should update the [bind group layout]{@link GPUBindGroupLayout}
   */
  shouldUpdateVideoTextureBindGroupLayout(textureIndex: number) {
    // if we're here it's because we've just uploaded an external texture
    // we need to flush the pipeline if the textures is not already in the externalTexturesIDs array
    if (this.externalTexturesIDs.includes(textureIndex)) {
      return false
    } else {
      this.externalTexturesIDs.push(textureIndex)
      this.needsPipelineFlush = true
      return this.needsPipelineFlush
    }
  }

  /**
   * Called if the result of {@link shouldUpdateVideoTextureBindGroupLayout} is true. Updates our {@link BindGroup#bindGroupLayout} {@link BindGroup#entries} on the fly, then recreates GPUBindGroupLayout.
   * Will also call {@link resetTextureBindGroup} afterwhile to recreate the GPUBindGroup.
   * @param textureIndex - the texture index in the bind group textures array
   */
  updateVideoTextureBindGroupLayout(textureIndex: number) {
    const texture = this.textures[textureIndex]

    // find the indexes of all bindings that have 'externalTexture' as bindingType
    const externalTexturesIndexes = [...this.bindings].reduce(
      (foundIndexes, binding, index) => (
        binding.bindingType === 'externalTexture' && foundIndexes.push(index), foundIndexes
      ),
      []
    )

    if (externalTexturesIndexes.length) {
      externalTexturesIndexes.forEach((bindingIndex) => {
        this.entries.bindGroupLayout[bindingIndex] = {
          binding: this.entries.bindGroupLayout[bindingIndex].binding,
          externalTexture: (texture as Texture).externalTexture,
          visibility: this.entries.bindGroupLayout[bindingIndex].visibility,
        }

        // patch binding as well
        if (this.bindings[bindingIndex]) {
          this.bindings[bindingIndex].wgslGroupFragment = texture.textureBinding.wgslGroupFragment
        }
      })

      // bind group will be set later anyway
      this.setBindGroupLayout()
    }
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
