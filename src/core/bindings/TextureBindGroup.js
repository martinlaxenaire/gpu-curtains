import { BindGroup } from './BindGroup'

export class TextureBindGroup extends BindGroup {
  constructor({ renderer, index = 0, bindings = [], texture = null }) {
    super({ renderer, index, bindings })

    this.texture = texture
  }

  canCreateBindGroup() {
    return !this.bindGroup && this.texture && this.texture.sampler && this.texture.texture
  }

  createTextureBindings() {
    this.bindings.forEach((uniformBinding) => {
      if (uniformBinding.type) {
        const bindingTypeValue =
          uniformBinding.type === 'texture' ? this.texture.texture.createView() : this.texture.sampler

        this.entries.bindGroupLayout.push({
          binding: uniformBinding.bindIndex,
          [uniformBinding.type]: bindingTypeValue,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        })

        this.entries.bindGroup.push({
          binding: uniformBinding.bindIndex,
          resource: bindingTypeValue,
        })
      }
    })
  }

  resetTextureBindGroup() {
    //this.entries.bindGroup = []

    // this.bindings.forEach((uniformBinding) => {
    //   if (uniformBinding.type) {
    //     const bindingTypeValue =
    //       uniformBinding.type === 'texture' ? this.texture.texture.createView() : this.texture.sampler
    //
    //     this.entries.bindGroup.push({
    //       binding: uniformBinding.bindIndex,
    //       resource: bindingTypeValue,
    //     })
    //   }
    // })

    this.entries.bindGroupLayout.forEach((bindGroupLayoutEntry, index) => {
      if (bindGroupLayoutEntry.sampler) {
        this.entries.bindGroup[index].resource = this.texture.sampler
      } else if (bindGroupLayoutEntry.texture) {
        this.entries.bindGroup[index].resource = this.texture.texture.createView()
      }
    })

    this.setBindGroup()
  }
}
