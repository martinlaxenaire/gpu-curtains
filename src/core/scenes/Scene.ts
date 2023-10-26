import { CameraRenderer, isRenderer, Renderer } from '../../utils/renderer-utils'
import { MeshType } from '../../types/core/renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { ComputePass } from '../computePasses/ComputePass'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { ProjectionStack, RenderPassEntry, RenderPassEntries } from '../../types/core/scenes/Scene'

export class Scene {
  renderer: Renderer
  computePassEntries: ComputePass[]
  renderPassEntries: RenderPassEntries

  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.computePassEntries = []

    this.renderPassEntries = {
      pingPong: [],
      renderTarget: [],
      screen: [
        // add our basic scene entry
        {
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
      ],
    }
  }

  addComputePass(computePass: ComputePass) {
    this.computePassEntries.push(computePass)
    this.computePassEntries.sort((a, b) => {
      if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder
      } else {
        return a.index - b.index
      }
    })
  }

  removeComputePass(computePass: ComputePass) {
    this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid)
  }

  addRenderTarget(renderTarget: RenderTarget) {
    // if RT is not already in the render pass entries
    if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
      this.renderPassEntries.renderTarget.push({
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
      } as RenderPassEntry)
  }

  removeRenderTarget(renderTarget: RenderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    )
  }

  getMeshProjectionStack(mesh: MeshType): ProjectionStack {
    // first get correct render pass enty and stack
    const renderPassEntry = mesh.renderTarget
      ? this.renderPassEntries.renderTarget.find(
          (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
        )
      : this.renderPassEntries.screen[0]

    const { stack } = renderPassEntry

    return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected
  }

  addMesh(mesh: MeshType) {
    const projectionStack = this.getMeshProjectionStack(mesh)

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
    similarMeshes.sort((a, b) => a.renderOrder - b.renderOrder)

    mesh.transparent ? (projectionStack.transparent = similarMeshes) : (projectionStack.opaque = similarMeshes)
  }

  removeMesh(mesh: MeshType) {
    const projectionStack = this.getMeshProjectionStack(mesh)

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  addShaderPass(shaderPass: ShaderPass) {
    this.renderPassEntries.screen.push({
      renderPass: this.renderer.renderPass, // render directly to screen
      renderTexture: null,
      onBeforeRenderPass: (commandEncoder, swapChainTexture) => {
        // draw the content into our render texture
        if (shaderPass.renderTexture) {
          commandEncoder.copyTextureToTexture(
            {
              texture: shaderPass.renderTarget ? shaderPass.renderTarget.renderTexture.texture : swapChainTexture,
            },
            {
              texture: shaderPass.renderTexture.texture,
            },
            [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
          )
        }

        if (!shaderPass.renderTarget) {
          // if we want to post process the whole scene, clear render pass content
          this.renderer.renderPass.setLoadOp('clear')
        }
      },
      onAfterRenderPass: (commandEncoder, swapChainTexture) => {
        // TODO do we still need to get the outputted texture?
        if (shaderPass.renderTarget) {
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
    })

    // screen passes are sorted by 2 criteria
    // first we draw render passes that have a render target OR our scene pass, ordered by renderOrder
    // then we draw our full post processing pass, ordered by renderOrder
    this.renderPassEntries.screen.sort((a, b) => {
      const isPostProA = a.element && !a.element.renderTarget
      const renderOrderA = a.element ? a.element.renderOrder : 0
      const indexA = a.element ? a.element.index : 0

      const isPostProB = b.element && !b.element.renderTarget
      const renderOrderB = b.element ? b.element.renderOrder : 0
      const indexB = b.element ? b.element.index : 0

      if (isPostProA && !isPostProB) {
        return 1
      } else if (!isPostProA && isPostProB) {
        return -1
      } else if (renderOrderA !== renderOrderB) {
        return renderOrderA - renderOrderB
      } else {
        return indexA - indexB
      }
    })
  }

  removeShaderPass(shaderPass: ShaderPass) {
    this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
      (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
    )
  }

  addPingPongPlane(pingPongPlane: PingPongPlane) {
    this.renderPassEntries.pingPong.push({
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
    } as RenderPassEntry)

    // sort by their render order
    this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder)
  }

  removePingPongPlane(pingPongPlane: PingPongPlane) {
    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    )
  }

  renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry) {
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
        if ((this.renderer as CameraRenderer).cameraBindGroup) {
          // set camera bind group once
          pass.setBindGroup(
            (this.renderer as CameraRenderer).cameraBindGroup.index,
            (this.renderer as CameraRenderer).cameraBindGroup.bindGroup
          )
        }

        renderPassEntry.stack.projected.opaque.forEach((mesh) => mesh.render(pass))
        renderPassEntry.stack.projected.transparent.forEach((mesh) => mesh.render(pass))
      }
    }

    pass.end()

    renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture)

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  render(commandEncoder: GPUCommandEncoder) {
    this.computePassEntries.forEach((computePass) => {
      if (!computePass.canComputePass) return

      const pass = commandEncoder.beginComputePass()
      computePass.render(pass)
      pass.end()

      computePass.copyBufferToResult(commandEncoder)

      this.renderer.pipelineManager.resetCurrentPipeline()
    })

    for (const renderPassEntryType in this.renderPassEntries) {
      let passDrawnCount = 0

      this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        // early bail if there's nothing to draw
        if (
          !renderPassEntry.element &&
          !renderPassEntry.stack.unProjected.opaque.length &&
          !renderPassEntry.stack.unProjected.transparent.length &&
          !renderPassEntry.stack.projected.opaque.length &&
          !renderPassEntry.stack.projected.transparent.length
        )
          return

        // if we're drawing to screen and it's not our first pass, load result from previous passes
        // post processing scene pass will clear content inside onBeforeRenderPass anyway
        renderPassEntry.renderPass.setLoadOp(
          renderPassEntryType === 'screen' && passDrawnCount !== 0 ? 'load' : 'clear'
        )

        passDrawnCount++

        this.renderSinglePassEntry(commandEncoder, renderPassEntry)
      })
    }
  }

  onAfterCommandEncoder() {
    this.computePassEntries.forEach((computePass) => {
      computePass.setWorkGroupsResult()
    })
  }
}
