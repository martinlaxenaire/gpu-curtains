import { BindGroup } from './BindGroup'

export class TextureBindGroup extends BindGroup {
  constructor({ renderer, index = 0, bindings = [], textures = [] }) {
    super({ renderer, index, bindings })

    this.textures = textures
  }

  addTexture(texture) {
    this.textures.push(texture)
    this.bindings = [...this.bindings, ...texture.uniformGroup.bindings]
  }

  canCreateBindGroup() {
    return !this.bindGroup && !this.textures.find((texture) => !texture.sampler || !texture.texture)
  }

  createBindingsBuffers() {
    let textureIndex = 0

    this.bindings.forEach((uniformBinding) => {
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
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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

        const bindingType = uniformBinding.type === 'sampler' ? 'sampler' : 'texture'
        const bindingTypeValue = uniformBinding.type === 'texture' ? texture.texture.createView() : texture.sampler

        this.entries.bindGroupLayout.push({
          binding: uniformBinding.bindIndex,
          [bindingType]: bindingTypeValue,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
    this.entries.bindGroupLayout.forEach((bindGroupLayoutEntry) => {
      if (bindGroupLayoutEntry.texture) {
        // texture bindGroup index is textureIndex * 3 + second position in bindings array
        this.entries.bindGroup[textureIndex * 3 + 1].resource = this.textures[textureIndex].texture.createView()
      }
    })

    this.setBindGroup()
  }
}
