import { isRenderer } from '../../utils/renderer-utils'

export class Scene {
  constructor({ renderer }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.renderStacks = []
    this.addStack(this.renderer.renderPass)

    // TODO new idea
    // this.renderPassesStack = {
    //   pingPongs: [],
    //   renderTargets: [],
    //   screen: [
    //     {
    //       renderPass: this.renderer.renderPass,
    //       renderTexture: null,
    //       stack: {
    //         unProjected: {
    //           opaque: [],
    //           transparent: [],
    //         },
    //         projected: {
    //           opaque: [],
    //           transparent: [],
    //         },
    //       },
    //     },
    //   ],
    // }
  }

  addStack(renderPass, renderTexture = null) {
    const renderStack = {
      renderPass,
      renderTexture,
      stack: {
        unProjected: {
          opaque: [],
          transparent: [],
          pingPong: [],
          shaderPasses: [],
        },
        projected: {
          opaque: [],
          transparent: [],
        },
      },
    }

    // add to the beginning of the render stack
    this.renderStacks.unshift(renderStack)
    this.renderStacks.sort((a, b) => {
      // render to textures first, then to screen
      if (!!a.renderTexture !== !!b.renderTexture) {
        if (!!a.renderTexture) {
          return -1
        } else {
          return 1
        }
      }
    })

    return renderStack
  }

  get toScreenStack() {
    return this.renderStacks[this.renderStacks.length - 1]
  }

  addRenderTarget(renderTarget) {
    if (!this.renderStacks.find((renderStack) => renderStack.renderPass.uuid === renderTarget.renderPass.uuid))
      this.addStack(renderTarget.renderPass, renderTarget.renderTexture)
  }

  removeRenderTarget(renderTarget) {
    this.renderStacks = this.renderStacks
      .filter((renderStack) => renderStack.renderPass.uuid !== renderTarget.renderPass.uuid)
      .sort((a, b) => {
        // render to textures first, then to screen
        if (!!a.renderTexture !== !!b.renderTexture) {
          if (!!a.renderTexture) {
            return -1
          } else {
            return 1
          }
        }
      })
  }

  // TODO removeMesh
  addMesh(mesh) {
    // TODO TEST
    // first get correct render stack
    const renderPass = mesh.renderTarget ? mesh.renderTarget.renderPass : this.renderer.renderPass
    const renderStack =
      this.renderStacks.find((renderStack) => renderStack.renderPass.uuid === renderPass.uuid) ??
      this.addStack(mesh.renderTarget.renderPass, mesh.renderTarget.renderTexture)

    const projectionStack = mesh.material.options.rendering.useProjection
      ? renderStack.stack.projected
      : renderStack.stack.unProjected

    // rebuild stack
    const similarMeshes = mesh.transparent ? [...projectionStack.transparent] : [...projectionStack.opaque]

    // find if there's already a plane with the same pipeline with a findLastIndex function
    let siblingMeshIndex = -1

    for (let i = similarMeshes.length - 1; i >= 0; i--) {
      if (similarMeshes[i].material.pipelineEntry.index === mesh.material.pipelineEntry.index) {
        siblingMeshIndex = i + 1
        break
      }
    }

    // if findIndex returned -1 (no matching pipeline)
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
    // first get correct render stack
    const renderPass = mesh.renderTarget ? mesh.renderTarget.renderPass : this.renderer.renderPass
    const renderStack = this.renderStacks.find((renderStack) => renderStack.renderPass.uuid === renderPass.uuid)

    const projectionStack = mesh.material.options.rendering.useProjection
      ? renderStack.stack.projected
      : renderStack.stack.unProjected

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  addShaderPass(shaderPass) {
    this.toScreenStack.stack.unProjected.shaderPasses.push(shaderPass)
    // sort by their render order
    this.toScreenStack.stack.unProjected.shaderPasses
      .sort((a, b) => b.renderOrder - a.renderOrder)
      .sort((a, b) => {
        // render shader passes with render targets first
        if (!!a.renderTarget !== !!b.renderTarget) {
          if (!!a.renderTarget) {
            return -1
          } else {
            return 1
          }
        }
      })
  }

  removeShaderPass(shaderPass) {
    this.toScreenStack.stack.unProjected.shaderPasses = this.toScreenStack.stack.unProjected.shaderPasses
      .filter((sP) => sP.uuid !== shaderPass.uuid)
      .sort((a, b) => {
        // render shader passes with render targets first
        if (!!a.renderTarget !== !!b.renderTarget) {
          if (!!a.renderTarget) {
            return -1
          } else {
            return 1
          }
        }
      })
  }

  addPingPongPlane(pingPongPlane) {
    const renderStack = this.renderStacks.find(
      (renderStack) => renderStack.renderPass.uuid === pingPongPlane.renderTarget.renderPass.uuid
    )

    renderStack.stack.unProjected.pingPong.push(pingPongPlane)
    // sort by their render order
    renderStack.stack.unProjected.pingPong.sort((a, b) => b.renderOrder - a.renderOrder)

    // this.toScreenStack.stack.unProjected.pingPong.push(pingPongPlane)
    // // sort by their render order
    // this.toScreenStack.stack.unProjected.pingPong.sort((a, b) => b.renderOrder - a.renderOrder)
  }

  removePingPongPlane(pingPongPlane) {
    const renderStack = this.renderStacks.find(
      (renderStack) => renderStack.renderPass.uuid === pingPongPlane.renderTarget.renderPass.uuid
    )

    renderStack.stack.unProjected.pingPong = renderStack.stack.unProjected.pingPong.filter(
      (pPP) => pPP.uuid !== pingPongPlane.uuid
    )

    // this.toScreenStack.stack.unProjected.pingPong = this.toScreenStack.stack.unProjected.pingPong.filter(
    //   (pPP) => pPP.uuid !== pingPongPlane.uuid
    // )
  }

  // TODO test
  render(commandEncoder) {
    this.renderStacks.forEach((renderStack) => {
      // set the pass texture to render to
      const swapChainTexture = this.renderer.setRenderPassCurrentTexture(
        renderStack.renderPass,
        renderStack.renderTexture?.texture
      )

      // start pass with clear content
      renderStack.renderPass.setLoadOp('clear')

      renderStack.stack.unProjected.pingPong.forEach((pingPongPlane) => {
        const pingPongRenderPass = commandEncoder.beginRenderPass(renderStack.renderPass.descriptor)
        pingPongPlane.render(pingPongRenderPass)
        pingPongRenderPass.end()

        // Copy the rendering results from the swapChainTexture into our |pingPongPlane texture|.
        commandEncoder.copyTextureToTexture(
          {
            texture: swapChainTexture,
          },
          {
            texture: pingPongPlane.renderTexture.texture,
          },
          [pingPongPlane.renderTexture.size.width, pingPongPlane.renderTexture.size.height]
        )
      })

      // now draw our regular meshes
      if (
        renderStack.stack.unProjected.opaque.length ||
        renderStack.stack.unProjected.transparent.length ||
        renderStack.stack.projected.opaque.length ||
        renderStack.stack.projected.transparent.length
      ) {
        const pass = commandEncoder.beginRenderPass(renderStack.renderPass.descriptor)

        // draw unProjected regular meshes
        renderStack.stack.unProjected.opaque.forEach((mesh) => mesh.render(pass))
        renderStack.stack.unProjected.transparent.forEach((mesh) => mesh.render(pass))

        // then draw projected meshes
        if (this.renderer.cameraBindGroup) {
          // set camera bind group once
          pass.setBindGroup(this.renderer.cameraBindGroup.index, this.renderer.cameraBindGroup.bindGroup)
        }

        renderStack.stack.projected.opaque.forEach((mesh) => mesh.render(pass))
        renderStack.stack.projected.transparent.forEach((mesh) => mesh.render(pass))

        pass.end()
      }

      // finally, draw shader passes
      renderStack.stack.unProjected.shaderPasses.forEach((shaderPass) => {
        // draw the content into our render texture
        commandEncoder.copyTextureToTexture(
          {
            texture: shaderPass.renderTarget ? shaderPass.renderTarget.renderTexture.texture : swapChainTexture,
          },
          {
            texture: shaderPass.renderTexture.texture,
          },
          [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
        )

        if (!shaderPass.renderTarget) {
          // if we render post process the whole scene, clear render pass content
          renderStack.renderPass.setLoadOp('clear')
        }

        const shaderPassRenderPass = commandEncoder.beginRenderPass(renderStack.renderPass.descriptor)
        shaderPass.render(shaderPassRenderPass)
        shaderPassRenderPass.end()

        if (shaderPass.renderTarget) {
          // use load operation for next render pass
          renderStack.renderPass.setLoadOp('load')

          // TODO do we still need to get the outputted texture?
          commandEncoder.copyTextureToTexture(
            {
              texture: swapChainTexture,
            },
            {
              texture: shaderPass.renderTarget.renderTexture.texture,
            },
            [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
          )
        }
      })

      this.renderer.pipelineManager.resetCurrentPipeline()
    })
  }
}
