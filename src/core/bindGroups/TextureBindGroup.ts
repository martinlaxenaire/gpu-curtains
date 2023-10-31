import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupBufferBindingElement, BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'

/**
 * An object defining all possible {@link TextureBindGroup} instancing parameters
 * @interface {object} TextureBindGroupParams
 * @extends BindGroupParams
 * @property {MaterialTexture[]} [textures=[]] - array of [textures]{@link MaterialTexture} to add to a {@link TextureBindGroup}
 * @property {Sampler[]} [samplers=[]] - array of {@link Sampler} to add to a {@link TextureBindGroup}
 */
export interface TextureBindGroupParams extends BindGroupParams {
  textures?: MaterialTexture[]
  samplers?: Sampler[]
}

/**
 * TextureBindGroup class:
 * Used to regroup all [bindings]{@link BindGroupBindingElement} related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 */
export class TextureBindGroup extends BindGroup {
  /**
   * An array containing all the already created external textures ID
   * @type {number[]}
   */
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
   * @param {MaterialTexture} texture - texture to add
   */
  addTexture(texture: MaterialTexture) {
    this.textures.push(texture)
    this.addBindings([...texture.bindings])
  }

  /**
   * Get the current textures array
   * @readonly
   * @type {MaterialTexture[]}
   */
  get textures(): MaterialTexture[] {
    return this.options.textures
  }

  /**
   * Adds a sampler to the samplers array and the bindings
   * @param {Sampler} sampler
   */
  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)
    this.addBindings([sampler.binding])
  }

  /**
   * Get the current samplers array
   * @readonly
   * @type {Sampler[]}
   */
  get samplers(): Sampler[] {
    return this.options.samplers
  }

  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
   * @readonly
   * @type {boolean}
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
   * Creates {@link BindGroup#bindings} for buffers, textures and samplers
   */
  createBindingsBuffers() {
    //let textureIndex = 0

    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      // if it's a buffer binding, use base class method
      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding as BindGroupBufferBindingElement)
      } else if ('resource' in inputBinding && inputBinding.resource && inputBinding.bindingType) {
        inputBinding.bindIndex = this.entries.bindGroupLayout.length

        //const texture = this.textures[textureIndex]

        const bindingTypeValue = (() => {
          switch (inputBinding.bindingType) {
            case 'texture':
              //textureIndex++
              return (inputBinding.resource as GPUTexture).createView()
            //return (texture.texture as GPUTexture).createView()
            case 'externalTexture':
              //textureIndex++
              return inputBinding.resource
            case 'sampler':
              return inputBinding.resource
            default:
              return inputBinding.resource
              break
          }
        })()

        this.entries.bindGroupLayout.push({
          binding: inputBinding.bindIndex,
          [inputBinding.bindingType]: bindingTypeValue,
          visibility: inputBinding.visibility,
        })

        this.entries.bindGroup.push({
          binding: inputBinding.bindIndex,
          resource: bindingTypeValue,
        } as GPUBindGroupEntry)
      }
    })
  }

  /**
   * Reset our {@link TextureBindGroup}, first by reassigning correct {@link BindGroup#entries} resources, then by recreating the GPUBindGroup.
   * Called each time a GPUTexture or GPUExternalTexture has changed:
   * - A texture media has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
   * - GPUExternalTexture at each tick
   * - A render texture GPUTexture has changed (on resize)
   */
  resetTextureBindGroup() {
    // reset all bind group texture entries
    const texturesEntries = this.entries.bindGroup.filter(
      (entry) => entry.resource instanceof GPUTextureView || entry.resource instanceof GPUExternalTexture
    )

    if (texturesEntries.length) {
      texturesEntries.forEach((entry, index) => {
        const texture = this.textures[index]

        // assign correct resource
        if (texture) {
          entry.resource =
            (texture as Texture).options?.sourceType === 'externalVideo'
              ? (texture as Texture).externalTexture
              : texture.texture.createView()
        }
      })

      this.setBindGroup()
    }
  }

  /**
   * Get whether we should update our video {@link TextureBindGroup}.
   * Happens when a GPUExternalTexture is created, we need to rebuild the {@link BindGroup#bindGroup} and {@link BindGroup#bindGroupLayout} from scratch. We might even need to recreate the whole pipeline (it it has already been created).
   * @param {number} textureIndex - the texture index in the bind group textures array
   * @returns {boolean}
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
   * @param {number} textureIndex - the texture index in the bind group textures array
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
