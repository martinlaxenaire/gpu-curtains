import { isRenderer } from '../../utils/renderer-utils'

export class Scene {
  constructor({ renderer }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.renderPassEntries = {
      pingPong: [],
      renderTarget: [],
      screen: [],
      postProcessing: [],
    }

    // add our scene render pass entry
    this.addRenderPassEntry({
      renderPassEntryType: 'screen',
      entry: {
        renderPass: this.renderer.renderPass,
        renderTexture: null,
        onBeforeRenderPass: null,
        onAfterRenderPass: null,
        element: null, // explicitly set to null
        stack: {
          unProjected: {
            opaque: [],
            transparent: [],
          },
          projected: {
            opaque: [],
            transparent: [],
          },
        },
      },
    })
  }

  addRenderPassEntry({ renderPassEntryType = 'screen', entry }) {
    this.renderPassEntries[renderPassEntryType].push(entry)
  }

  addRenderTarget(renderTarget) {
    // if RT is not already in the render pass entries
    if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
      this.addRenderPassEntry({
        renderPassEntryType: 'renderTarget',
        entry: {
          renderPass: renderTarget.renderPass,
          renderTexture: renderTarget.renderTexture,
          onBeforeRenderPass: null,
          onAfterRenderPass: null,
          element: null, // explicitly set to null
          stack: {
            unProjected: {
              opaque: [],
              transparent: [],
            },
            projected: {
              opaque: [],
              transparent: [],
            },
          },
        },
      })
  }

  removeRenderTarget(renderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    )
  }

  addMesh(mesh) {
    // first get correct render stack
    const renderPassEntry = mesh.renderTarget
      ? this.renderPassEntries.renderTarget.find(
          (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
        )
      : this.renderPassEntries.screen[0]

    const { stack } = renderPassEntry

    const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected

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
    const renderPassEntry = mesh.renderTarget
      ? this.renderPassEntries.renderTarget.find(
          (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
        )
      : this.renderPassEntries.screen[0]
    const { stack } = renderPassEntry

    const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  addShaderPass(shaderPass) {
    this.addRenderPassEntry({
      renderPassEntryType: 'postProcessing',
      entry: {
        renderPass: this.renderer.renderPass, // post processing will render directly to screen
        renderTexture: null,
        onBeforeRenderPass: (commandEncoder, swapChainTexture) => {
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
            this.renderer.renderPass.setLoadOp('clear')
          }
        },
        onAfterRenderPass: (commandEncoder, swapChainTexture) => {
          if (shaderPass.renderTarget) {
            // use load operation for next render pass
            this.renderer.renderPass.setLoadOp('load')

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
        },
        element: shaderPass,
        stack: null, // explicitly set to null
      },
    })

    // sort by their render order & RTs (draw shader passes with a render target first!)
    this.renderPassEntries.postProcessing
      .sort((a, b) => b.element.renderOrder - a.element.renderOrder)
      .sort((a, b) => {
        // render shader passes with render targets first
        if (!!a.element.renderTarget !== !!b.element.renderTarget) {
          if (!!a.element.renderTarget) {
            return -1
          } else {
            return 1
          }
        }
      })
  }

  removeShaderPass(shaderPass) {
    // TODO need to sort again?
    this.renderPassEntries.postProcessing = this.renderPassEntries.postProcessing.filter(
      (entry) => entry.element.uuid !== shaderPass.uuid
    )
  }

  addPingPongPlane(pingPongPlane) {
    this.addRenderPassEntry({
      renderPassEntryType: 'pingPong',
      entry: {
        renderPass: pingPongPlane.renderTarget.renderPass,
        renderTexture: pingPongPlane.renderTarget.renderTexture,
        onBeforeRenderPass: null,
        onAfterRenderPass: (commandEncoder, swapChainTexture) => {
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
        },
        element: pingPongPlane,
        stack: null, // explicitly set to null
      },
    })

    // sort by their render order
    this.renderPassEntries.pingPong.sort((a, b) => b.element.renderOrder - a.element.renderOrder)
  }

  removePingPongPlane(pingPongPlane) {
    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    )
  }

  renderSinglePassEntry(commandEncoder, renderPassEntry) {
    // early bail if there's nothing to draw
    if (
      !renderPassEntry.element &&
      !renderPassEntry.stack.unProjected.opaque.length &&
      !renderPassEntry.stack.unProjected.transparent.length &&
      !renderPassEntry.stack.projected.opaque.length &&
      !renderPassEntry.stack.projected.transparent.length
    )
      return

    // set the pass texture to render to
    const swapChainTexture = this.renderer.setRenderPassCurrentTexture(
      renderPassEntry.renderPass,
      renderPassEntry.renderTexture?.texture
    )

    renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture)

    // now begin our actual render passs
    const pass = commandEncoder.beginRenderPass(renderPassEntry.renderPass.descriptor)

    // pass entries can have a single element or a stack
    if (renderPassEntry.element) {
      renderPassEntry.element.render(pass)
    } else if (renderPassEntry.stack) {
      // draw unProjected regular meshes
      renderPassEntry.stack.unProjected.opaque.forEach((mesh) => mesh.render(pass))
      renderPassEntry.stack.unProjected.transparent.forEach((mesh) => mesh.render(pass))

      // then draw projected meshes
      if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
        if (this.renderer.cameraBindGroup) {
          // set camera bind group once
          pass.setBindGroup(this.renderer.cameraBindGroup.index, this.renderer.cameraBindGroup.bindGroup)
        }

        renderPassEntry.stack.projected.opaque.forEach((mesh) => mesh.render(pass))
        renderPassEntry.stack.projected.transparent.forEach((mesh) => mesh.render(pass))
      }
    }

    pass.end()

    renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture)

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  render(commandEncoder) {
    for (const renderPassEntryType in this.renderPassEntries) {
      this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        this.renderSinglePassEntry(commandEncoder, renderPassEntry)
      })
    }
  }
}
