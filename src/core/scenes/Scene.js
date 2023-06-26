import { isRenderer } from '../../utils/renderer-utils'

export class Scene {
  constructor({ renderer }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, 'Scene')) {
      console.warn('Scene fail')
      return
    }

    this.renderer = renderer
    this.renderPasses = this.renderer.renderPasses

    this.setStacks()
  }

  setStacks() {
    this.stacks = {
      opaque: [],
      transparent: [],
      shaderPasses: [],
    }
  }

  // TODO removeMesh
  addMesh(mesh) {
    // rebuild stack
    const similarMeshesStack = this.renderer.meshes.filter(
      (m) => m.transparent === mesh.transparent && m.uuid !== mesh.uuid
    )
    // find if there's already a plane with the same geometry with a findLastIndex function
    let siblingMeshIndex = -1

    for (let i = similarMeshesStack.length - 1; i >= 0; i--) {
      if (similarMeshesStack[i].material.pipelineEntry.index === mesh.material.pipelineEntry.index) {
        siblingMeshIndex = i + 1
        break
      }
    }

    // if findIndex returned -1 (no matching geometry or program)
    siblingMeshIndex = Math.max(0, siblingMeshIndex)

    // add it to our stack plane array
    similarMeshesStack.splice(siblingMeshIndex, 0, mesh)
    similarMeshesStack.sort((a, b) => a.index - b.index)

    // sort by Z pos
    if (mesh.transparent) {
      similarMeshesStack.sort((a, b) => b.documentPosition.z - a.documentPosition.z)
    }

    // then sort by their render order
    similarMeshesStack.sort((a, b) => b.renderOrder - a.renderOrder)

    mesh.transparent ? (this.stacks.transparent = similarMeshesStack) : (this.stacks.opaque = similarMeshesStack)
  }

  addShaderPass(shaderPass) {
    this.stacks.shaderPasses.push(shaderPass)
  }

  // render(pass) {
  //   // render opaque meshes first
  //   this.stacks.opaque.forEach((mesh) => mesh.render(pass))
  //
  //   this.stacks.transparent.forEach((mesh) => mesh.render(pass))
  // }

  render(commandEncoder) {
    // draw our meshes first
    const renderTexture = this.renderer.setRenderPassCurrentTexture(this.renderer.renderPass)

    const pass = commandEncoder.beginRenderPass(this.renderer.renderPass.descriptor)

    this.stacks.opaque.forEach((mesh) => mesh.render(pass))
    this.stacks.transparent.forEach((mesh) => mesh.render(pass))

    pass.end()

    this.stacks.shaderPasses.forEach((shaderPass) => {
      commandEncoder.copyTextureToTexture(
        {
          texture: renderTexture,
        },
        {
          texture: shaderPass.renderTexture.texture,
        },
        [shaderPass.renderPass.size.width, shaderPass.renderPass.size.height]
      )

      this.renderer.setRenderPassCurrentTexture(shaderPass.renderPass)

      const shaderPassRenderPass = commandEncoder.beginRenderPass(shaderPass.renderPass.descriptor)
      shaderPass.render(shaderPassRenderPass)
      shaderPassRenderPass.end()
    })
  }
}
