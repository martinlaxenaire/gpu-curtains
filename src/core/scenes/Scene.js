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
      unprojected: {
        opaque: [],
        transparent: [],
        shaderPasses: [],
      },
      projected: {
        opaque: [],
        transparent: [],
      },
    }
  }

  // TODO removeMesh
  addMesh(mesh) {
    const projectionStack = mesh.material.options.rendering.useProjection
      ? this.stacks.projected
      : this.stacks.unprojected

    // rebuild stack
    const similarMeshes = this.renderer.meshes.filter((m) => m.transparent === mesh.transparent && m.uuid !== mesh.uuid)
    // find if there's already a plane with the same pipeline with a findLastIndex function
    let siblingMeshIndex = -1

    for (let i = similarMeshes.length - 1; i >= 0; i--) {
      if (similarMeshes[i].material.pipelineEntry.index === mesh.material.pipelineEntry.index) {
        siblingMeshIndex = i + 1
        break
      }
    }

    // if findIndex returned -1 (no matching geometry or program)
    siblingMeshIndex = Math.max(0, siblingMeshIndex)

    // add it to our stack plane array
    similarMeshes.splice(siblingMeshIndex, 0, mesh)
    similarMeshes.sort((a, b) => a.index - b.index)

    // sort by Z pos if transparent
    if (mesh.transparent) {
      similarMeshes.sort((a, b) => b.documentPosition.z - a.documentPosition.z)
    }

    // then sort by their render order
    similarMeshes.sort((a, b) => b.renderOrder - a.renderOrder)

    mesh.transparent ? (projectionStack.transparent = similarMeshes) : (projectionStack.opaque = similarMeshes)
  }

  removeMesh(mesh) {
    const projectionStack = mesh.material.options.rendering.useProjection
      ? this.stacks.projected
      : this.stacks.unprojected

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  addShaderPass(shaderPass) {
    this.stacks.unprojected.shaderPasses.push(shaderPass)
    // sort by their render order
    this.stacks.unprojected.shaderPasses.sort((a, b) => b.renderOrder - a.renderOrder)
  }

  removeShaderPass(shaderPass) {
    this.stacks.unprojected.shaderPasses = this.stacks.unprojected.shaderPasses.filter(
      (sP) => sP.uuid !== shaderPass.uuid
    )
  }

  render(commandEncoder) {
    // draw our meshes first
    const renderTexture = this.renderer.setRenderPassCurrentTexture(this.renderer.renderPass)

    const pass = commandEncoder.beginRenderPass(this.renderer.renderPass.descriptor)

    // draw unprojected regular meshes first
    this.stacks.unprojected.opaque.forEach((mesh) => mesh.render(pass))
    this.stacks.unprojected.transparent.forEach((mesh) => mesh.render(pass))

    // then draw projected meshes
    if (this.renderer.cameraBindGroup) {
      // set camera bind group once
      pass.setBindGroup(this.renderer.cameraBindGroup.index, this.renderer.cameraBindGroup.bindGroup)
    }

    this.stacks.projected.opaque.forEach((mesh) => mesh.render(pass))
    this.stacks.projected.transparent.forEach((mesh) => mesh.render(pass))

    pass.end()

    this.stacks.unprojected.shaderPasses.forEach((shaderPass) => {
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
