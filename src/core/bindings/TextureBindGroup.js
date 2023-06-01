import { BindGroup } from './BindGroup'

export class TextureBindGroup extends BindGroup {
  constructor({ renderer, index = 0, bindings = [], textures = [] }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || !(renderer.type === 'Renderer' || renderer.type === 'CurtainsRenderer')) {
      return
    }

    super({ renderer, index, bindings })

    this.textures = textures
    this.hasVideoTexture = false
  }

  addTexture(texture) {
    this.textures.push(texture)
    this.bindings = [...this.bindings, ...texture.bindings]
  }

  canCreateBindGroup() {
    // return (
    //   !this.bindGroup &&
    //   !this.textures.find(
    //     (texture) =>
    //       !texture.sampler ||
    //       (texture.options.sourceType !== 'video' && !texture.texture) ||
    //       (texture.options.sourceType === 'video' && !texture.source)
    //   )
    // )

    return !this.bindGroup && !this.textures.find((texture) => !texture.sampler || !texture.texture)
  }

  createBindingsBuffers() {
    let textureIndex = 0

    this.bindings.forEach((uniformBinding) => {
      if (!uniformBinding.visibility) uniformBinding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT

      if (!!uniformBinding.value) {
        uniformBinding.bindIndex = this.entries.bindGroupLayout.length

        const buffer = this.renderer.device.createBuffer({
          label: ': Uniforms buffer from:' + uniformBinding.label, // TODO
          size: uniformBinding.value.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.bindingsBuffers.push({
          uniformBinding,
          buffer,
        })

        this.entries.bindGroupLayout.push({
          binding: uniformBinding.bindIndex,
          buffer,
          visibility: uniformBinding.visibility,
        })

        this.entries.bindGroup.push({
          binding: uniformBinding.bindIndex,
          resource: {
            buffer,
          },
        })
      } else if (uniformBinding.type) {
        uniformBinding.bindIndex = this.entries.bindGroupLayout.length
        const texture = this.textures[Math.floor(textureIndex * 0.5)]

        const bindingTypeValue = (() => {
          switch (uniformBinding.type) {
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
          [uniformBinding.type]: bindingTypeValue,
          visibility: uniformBinding.visibility,
        })

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
    if (this.entries.bindGroup[textureIndex * 3 + 1] && texture) {
      this.entries.bindGroup[textureIndex * 3 + 1].resource =
        texture.options.sourceType === 'video' ? texture.texture : texture.texture.createView()

      this.setBindGroup()
    }
  }

  updateVideoTextureBindGroup(textureIndex) {
    const texture = this.textures[textureIndex]

    // now we have to patch bindGroupLayout,  bindGroup entries and binding at index textureIndex * 3 + 1
    const entryIndex = textureIndex * 3 + 1
    if (texture && this.entries.bindGroupLayout[entryIndex] && this.entries.bindGroup[entryIndex]) {
      this.entries.bindGroupLayout[entryIndex] = {
        binding: this.entries.bindGroupLayout[entryIndex].binding,
        [texture.bindings[1].type]: texture.texture,
        visibility: this.entries.bindGroupLayout[entryIndex].visibility,
      }

      this.entries.bindGroup[entryIndex].resource = texture.texture

      // patch binding as well
      if (this.bindings[entryIndex]) {
        this.bindings[entryIndex].wgslGroupFragment = texture.bindings[1].wgslGroupFragment
      }

      // bind group will be set later anyway
      this.setBindGroupLayout()
    }
  }
}
