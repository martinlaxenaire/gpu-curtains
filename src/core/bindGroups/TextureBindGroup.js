import { BindGroup } from './BindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class TextureBindGroup extends BindGroup {
  constructor({ label, renderer, index = 0, bindings = [], textures = [] }) {
    const type = 'TextureBindGroup'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, type)

    super({ label, renderer, index, bindings })

    this.type = type
    this.textures = textures

    // keep track of external textures to know when to flush
    this.externalTexturesIDs = []
  }

  addTexture(texture) {
    this.textures.push(texture)
    // TODO avoid duplicate samplers in bindings? How to handle sampler names in shader?
    this.bindings = [...this.bindings, ...texture.bindings]
  }

  get shouldCreateBindGroup() {
    return (
      !this.bindGroup && this.textures.length && !this.textures.find((texture) => !texture.sampler || !texture.texture)
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
        const texture = this.textures[Math.floor(textureIndex * 0.5)]

        const bindingTypeValue = (() => {
          switch (inputBinding.bindingType) {
            case 'texture':
              return texture.texture.createView()
            case 'externalTexture':
              return texture.texture
            case 'sampler':
              return texture.sampler
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

        textureIndex++
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
    const entryIndex = textureIndex * 3 + 1
    if (texture && this.entries.bindGroupLayout[entryIndex] && this.bindings[entryIndex]) {
      this.entries.bindGroupLayout[entryIndex] = {
        binding: this.entries.bindGroupLayout[entryIndex].binding,
        [texture.bindings[1].bindingType]: texture.texture,
        visibility: this.entries.bindGroupLayout[entryIndex].visibility,
      }

      // patch binding as well
      if (this.bindings[entryIndex]) {
        this.bindings[entryIndex].wgslGroupFragment = texture.bindings[1].wgslGroupFragment
      }

      // bind group will be set later anyway
      this.setBindGroupLayout()
    }
  }

  destroy() {
    super.destroy()
    this.textures = []
  }
}
