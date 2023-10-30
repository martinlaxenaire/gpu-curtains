import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupBufferBindingElement, BindGroupParams } from '../../types/BindGroups'
import { MaterialTexture } from '../../types/Materials'

export interface TextureBindGroupParams extends BindGroupParams {
  textures?: MaterialTexture[]
  samplers?: Sampler[]
}

/**
 * TextureBindGroup class:
 * Used to regroup all bindings related to textures (texture, texture matrices buffers and sampler) into one single specific bind group.
 * @extends BindGroup
 */
export class TextureBindGroup extends BindGroup {
  externalTexturesIDs: number[]

  /**
   * TextureBindGroup constructor
   * @param {Renderer | GPUCurtains} renderer - our renderer class object
   * @param {TextureBindGroupParams=} parameters - parameters used to create our texture bind group
   * @param {string=} parameters.label - bind group label
   * @param {number=} parameters.index - bind group index (used to generate shader code)
   * @param {BindGroupBindingElement[]=} parameters.bindings - array of already created bindings (buffers, texture, etc.)
   * @param {BindGroupInputs} parameters.inputs - inputs that will be used to create additional bindings
   * @param {MaterialTexture[]=} parameters.textures - array of textures to add to this texture bind group
   * @param {Sampler[]=} parameters.samplers - array of samplers to add to this texture bind group
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
   * It can be created if it has bindings and has not been created yet and all GPU textures and samplers are created
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
   * Creates bindings for buffers, textures and samplers
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
   * Reset our texture bind group, first by reassigning correct entries resources, then by recreating the GPUBindGroup.
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
   * Get whether we should update our video texture bind group.
   * Happens when a GPUExternalTexture is created, we need to rebuild the bind group and bind group layout from scratch. We might even need to recreate the whole pipeline (it it has already been created).
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
   * Called if the result of {@link shouldUpdateVideoTextureBindGroupLayout} is true. Updates our bind group layout entries on the fly, then recreates GPUBindGroupLayout. Will also call {@link resetTextureBindGroup} afterwhile to recreate the GPUBindGroup.
   * @param {number} textureIndex - the texture index in the bind group textures array
   */
  updateVideoTextureBindGroupLayout(textureIndex: number) {
    // TODO might refactor for something simpler?
    const texture = this.textures[textureIndex]

    // now we have to patch bindGroupLayout and binding at index textureIndex?
    // bindGroup will be updated inside resetTextureBindGroup
    let entryIndex = 0
    let countTextures = 0
    this.entries.bindGroup.forEach((entry, index) => {
      if (entry.resource instanceof GPUTextureView || entry.resource instanceof GPUExternalTexture) {
        entryIndex = index

        if (countTextures >= textureIndex) {
          return
        }

        countTextures++
      }
    })

    if (texture && this.entries.bindGroupLayout[entryIndex] && this.bindings[entryIndex]) {
      this.entries.bindGroupLayout[entryIndex] = {
        binding: this.entries.bindGroupLayout[entryIndex].binding,
        [texture.bindings[0].bindingType]: (texture as Texture).externalTexture, // TODO check!!
        visibility: this.entries.bindGroupLayout[entryIndex].visibility,
      }

      // patch binding as well
      if (this.bindings[entryIndex]) {
        this.bindings[entryIndex].wgslGroupFragment = texture.bindings[0].wgslGroupFragment
      }

      // bind group will be set later anyway
      this.setBindGroupLayout()
    }
  }

  /**
   * Destroy our texture bind group
   */
  destroy() {
    super.destroy()
    this.options.textures = []
    this.options.samplers = []
  }
}
