import { BindGroup } from './BindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class TextureBindGroup extends BindGroup {
  constructor(renderer, { label, index = 0, bindings = [], inputs, textures = [], samplers = [] } = {}) {
    const type = 'TextureBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, type)

    super({ label, renderer, index, bindings, inputs })

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

  addTexture(texture) {
    this.textures.push(texture)
    // TODO avoid duplicate samplers in bindings? How to handle sampler names in shader?
    this.bindings = [...this.bindings, ...texture.bindings]
  }

  get textures() {
    return this.options.textures
  }

  addSampler(sampler) {
    this.samplers.push(sampler)

    this.bindings = [...this.bindings, sampler.binding]
  }

  get samplers() {
    return this.options.samplers
  }

  get shouldCreateBindGroup() {
    return (
      !this.bindGroup &&
      !this.textures.find((texture) => !texture.texture) &&
      !this.samplers.find((sampler) => !sampler.sampler)
    )
  }

  createBindingsBuffers() {
    let textureIndex = 0

    this.bindings.forEach((inputBinding) => {
      if (!inputBinding.visibility) inputBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!inputBinding.value) {
        this.createBindingBuffer(inputBinding)
      } else if (inputBinding.bindingType) {
        inputBinding.bindIndex = this.entries.bindGroupLayout.length

        const texture = this.textures[textureIndex]

        const bindingTypeValue = (() => {
          switch (inputBinding.bindingType) {
            case 'texture':
              textureIndex++
              return texture.texture.createView()
            case 'externalTexture':
              textureIndex++
              return texture.texture
            case 'sampler':
              return inputBinding.resource
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

        if (inputBinding.bindingType === 'externalTexture') console.log(inputBinding.bindingType, this.entries)

        this.entries.bindGroup.push({
          binding: inputBinding.bindIndex,
          resource: bindingTypeValue,
        })

        //textureIndex++
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
            texture.options.sourceType === 'externalVideo' ? texture.texture : texture.texture.createView()
      })

      this.setBindGroup()
    }
  }

  shouldUpdateVideoTextureBindGroupLayout(textureIndex) {
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

  updateVideoTextureBindGroupLayout(textureIndex) {
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
        [texture.bindings[0].bindingType]: texture.texture,
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
