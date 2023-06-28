import { BindGroup } from './BindGroup'
import { isRenderer } from '../../utils/renderer-utils'

export class TextureBindGroup extends BindGroup {
  constructor({ label, renderer, index = 0, bindings = [], textures = [] }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, 'TextureBindGroup')) {
      console.warn('TextureBindGroup fail')
      return
    }

    super({ label, renderer, index, bindings })

    this.textures = textures

    // keep track of external textures to know when to flush
    this.externalTexturesIDs = []
  }

  addTexture(texture) {
    this.textures.push(texture)
    this.bindings = [...this.bindings, ...texture.bindings]
  }

  get shouldCreateBindGroup() {
    return !this.bindGroup && !this.textures.find((texture) => !texture.sampler || !texture.texture)
  }

  createBindingsBuffers() {
    let textureIndex = 0

    this.bindings.forEach((uniformBinding) => {
      if (!uniformBinding.visibility) uniformBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!uniformBinding.value) {
        this.createBindingBuffer(uniformBinding)
      } else if (uniformBinding.bindingType) {
        uniformBinding.bindIndex = this.entries.bindGroupLayout.length
        const texture = this.textures[Math.floor(textureIndex * 0.5)]

        const bindingTypeValue = (() => {
          switch (uniformBinding.bindingType) {
            case 'texture':
              return texture.texture.createView()
            case 'externalTexture':
              return texture.texture
            case 'sampler':
              return texture.sampler
            default:
              console.warn('No bind group layout type provided by', uniformBinding)
              break
          }
        })()

        this.entries.bindGroupLayout.push({
          binding: uniformBinding.bindIndex,
          [uniformBinding.bindingType]: bindingTypeValue,
          visibility: uniformBinding.visibility,
        })

        if (uniformBinding.bindingType === 'externalTexture') console.log(uniformBinding.bindingType, this.entries)

        this.entries.bindGroup.push({
          binding: uniformBinding.bindIndex,
          resource: bindingTypeValue,
        })

        textureIndex++
      }
    })
  }

  resetTextureBindGroup(textureIndex) {
    const texture = this.textures[textureIndex]

    // texture bindGroup index is textureIndex * 3 + second position in bindings array
    const entryIndex = textureIndex * 3 + 1
    if (this.entries.bindGroup[entryIndex] && texture) {
      this.entries.bindGroup[entryIndex].resource =
        texture.options.sourceType === 'video' ? texture.texture : texture.texture.createView()

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
}
