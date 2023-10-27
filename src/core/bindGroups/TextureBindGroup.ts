import { BindGroup } from './BindGroup'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { TextureBindGroupParams } from '../../types/core/bindGroups/TextureBindGroup'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'
import { BindGroupBufferBindingElement } from '../../types/core/bindGroups/BindGroup'
import { SamplerBindings } from '../bindings/SamplerBindings'
import { MaterialTexture } from '../../types/core/materials/Material'

export class TextureBindGroup extends BindGroup {
  externalTexturesIDs: number[]

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

  addTexture(texture: MaterialTexture) {
    this.textures.push(texture)
    this.bindings = [...this.bindings, ...texture.bindings]
  }

  get textures(): MaterialTexture[] {
    return this.options.textures
  }

  addSampler(sampler: Sampler) {
    this.samplers.push(sampler)

    this.bindings = [...this.bindings, sampler.binding]
  }

  get samplers(): Sampler[] {
    return this.options.samplers
  }

  get shouldCreateBindGroup(): boolean {
    return (
      !this.bindGroup &&
      !!this.bindings.length &&
      !this.textures.find((texture) => !texture.texture) &&
      !this.samplers.find((sampler) => !sampler.sampler)
    )
  }

  createBindingsBuffers() {
    let textureIndex = 0

    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding as BindGroupBufferBindingElement)
      } else if (inputBinding.bindingType) {
        inputBinding.bindIndex = this.entries.bindGroupLayout.length

        const texture = this.textures[textureIndex]

        const bindingTypeValue = (() => {
          switch (inputBinding.bindingType) {
            case 'texture':
              textureIndex++
              return (texture.texture as GPUTexture).createView()
            case 'externalTexture':
              textureIndex++
              return (texture as Texture).externalTexture
            case 'sampler':
              return (inputBinding as SamplerBindings).resource
            default:
              console.warn('No bind group layout type provided by', inputBinding)
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

  resetTextureBindGroup() {
    // reset all bind group texture entries
    const texturesEntries = this.entries.bindGroup.filter(
      (entry) => entry.resource instanceof GPUTextureView || entry.resource instanceof GPUExternalTexture
    )

    if (texturesEntries.length) {
      texturesEntries.forEach((entry, index) => {
        const texture = this.textures[index]

        if (texture)
          entry.resource =
            (texture as Texture).options?.sourceType === 'externalVideo'
              ? (texture as Texture).externalTexture
              : texture.texture.createView()
      })

      this.setBindGroup()
    }
  }

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

  updateVideoTextureBindGroupLayout(textureIndex: number) {
    const texture = this.textures[textureIndex]

    // now we have to patch bindGroupLayout and binding at index textureIndex * 3 + 1
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
        //[texture.bindings[0].bindingType]: texture.texture,
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

  destroy() {
    super.destroy()
    this.options.textures = []
    this.options.samplers = []
  }
}
