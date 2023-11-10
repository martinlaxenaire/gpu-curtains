import { CameraRenderer, isRenderer, Renderer } from '../../utils/renderer-utils'
import { DOMMeshType, MeshType } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { ComputePass } from '../computePasses/ComputePass'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { Plane } from '../../curtains/meshes/Plane'
import { RenderPass } from '../renderPasses/RenderPass'
import { RenderTexture } from '../textures/RenderTexture'

/**
 * Meshes rendering order is dependant of their transparency setting
 */
export interface ProjectionStack {
  /** opaque Meshes will be drawn first */
  opaque: MeshType[]
  /** transparent Meshes will be drawn last */
  transparent: MeshType[]
}

/** Meshes will be stacked in 2 different objects whether they are projected (use a {@link Camera}) or not */
export type ProjectionType = 'unProjected' | 'projected'

/**
 * Meshes will be put into two stacks of projected/unprojected transparent and opaques meshes arrays
 */
export type Stack = Record<ProjectionType, ProjectionStack>

/**
 * A RenderPassEntry object is used to group Meshes based on their rendering target
 */
export interface RenderPassEntry {
  /** [render pass]{@link RenderPass} target used onto which render */
  renderPass: RenderPass
  /** [render texture]{@link RenderTexture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen) */
  renderTexture: RenderTexture | null
  /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy */
  onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy */
  onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** If this {@link RenderPassEntry} needs to render only one Mesh */
  element: MeshType | ShaderPass | PingPongPlane | null
  /** If this {@link RenderPassEntry} needs to render multiple Meshes, then use a {@link Stack} object */
  stack: Stack | null
}

/** Defines all our possible render targets */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen'
/** Defines our render pass entries object */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>

/**
 * Scene class:
 * Used to render everything that needs to be rendered (compute passes and meshes) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 */
export class Scene {
  /** [renderer]{@link Renderer} used by this {@link Scene} */
  renderer: Renderer
  /** Array of [compute passes]{@link ComputePass} to render, ordered by [render order]{@link ComputePass#renderOrder} */
  computePassEntries: ComputePass[]
  /**
   * A {@link RenderPassEntries} object that will contain every Meshes that need to be drawn, put inside each one of our three entries type arrays: 'pingPong', 'renderTarget' and 'screen'.
   * The {@link Scene} will first render all [pingPong entries]{@link Scene#renderPassEntries.pingPong} Meshes, then all Meshes that need to be rendered into specific [renderTarget entries]{@link Scene#renderPassEntries.renderTarget} and finally all Meshes that need to be rendered to the [screen]{@link Scene#renderPassEntries.screen}
   */
  renderPassEntries: RenderPassEntries

  /**
   * Scene constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
   */
  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.computePassEntries = []

    this.renderPassEntries = {
      /** Array of [render pass entries]{@link RenderPassEntry} that will handle [ping pong planes]{@link PingPongPlane}. Each [ping pong plane]{@link PingPongPlane} will be added as a distinct [render pass entry]{@link RenderPassEntry} here */
      pingPong: [] as RenderPassEntry[],
      /** Array of [render pass entries]{@link RenderPassEntry} that will render to a specific [render target]{@link RenderTarget}. Each [render target]{@link RenderTarget} will be added as a distinct [render pass entry]{@link RenderPassEntry} here */
      renderTarget: [] as RenderPassEntry[],
      /** Array of [render pass entries]{@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any [render target]{@link RenderTarget} assigned. Following entries will be created for every global [post processing passes]{@link ShaderPass} */
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
      ] as RenderPassEntry[],
    }
  }

  /**
   * Add a [compute pass]{@link ComputePass} to our scene [computePassEntries array]{@link Scene#computePassEntries}
   * @param computePass - [compute pass]{@link ComputePass} to add
   */
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

  /**
   * Remove a [compute pass]{@link ComputePass} from our scene [computePassEntries array]{@link Scene#computePassEntries}
   * @param computePass - [compute pass]{@link ComputePass} to remove
   */
  removeComputePass(computePass: ComputePass) {
    this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid)
  }

  /**
   * Add a [render target]{@link RenderTarget} to our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
   * Every Meshes later added to this [render target]{@link RenderTarget} will be rendered to the [render target render texture]{@link RenderTarget#renderTexture} using the [render target render pass descriptor]{@link RenderTarget#renderPass.descriptor}
   * @param renderTarget - [render target]{@link RenderTarget} to add
   */
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

  /**
   * Remove a [render target]{@link RenderTarget} from our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
   * @param renderTarget - [render target]{@link RenderTarget} to add
   */
  removeRenderTarget(renderTarget: RenderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    )
  }

  /**
   * Get the correct [render pass entry]{@link Scene#renderPassEntries} (either [renderTarget]{@link Scene#renderPassEntries.renderTarget} or [screen]{@link Scene#renderPassEntries.screen}) [stack]{@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
   * @param mesh - Mesh to check
   * @returns - the corresponding [render pass entry stack]{@link Stack}
   */
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

  /**
   * Add a Mesh to the correct [render pass entry]{@link Scene#renderPassEntries} [stack]{@link Stack} array.
   * Meshes are then ordered by their [indexes (order of creation]){@link MeshBase#index}, position along the Z axis in case they are transparent and then [renderOrder]{@link MeshBase#renderOrder}
   * @param mesh - Mesh to add
   */
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
    if ((mesh instanceof DOMMesh || mesh instanceof Plane) && mesh.transparent) {
      similarMeshes.sort((a, b) => (b as DOMMeshType).documentPosition.z - (a as DOMMeshType).documentPosition.z)
    }

    // then sort by their render order
    similarMeshes.sort((a, b) => a.renderOrder - b.renderOrder)

    mesh.transparent ? (projectionStack.transparent = similarMeshes) : (projectionStack.opaque = similarMeshes)
  }

  /**
   * Remove a Mesh from our {@link Scene}
   * @param mesh - Mesh to remove
   */
  removeMesh(mesh: MeshType) {
    const projectionStack = this.getMeshProjectionStack(mesh)

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  /**
   * Add a [shader pass]{@link ShaderPass} to our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}.
   * Before rendering the [shader pass]{@link ShaderPass}, we will copy the correct input texture into its [render texture]{@link ShaderPass#renderTexture}
   * This also handles the [renderPassEntries screen array]{@link Scene#renderPassEntries.screen} entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
   * @param shaderPass - [shader pass]{@link ShaderPass} to add
   */
  addShaderPass(shaderPass: ShaderPass) {
    this.renderPassEntries.screen.push({
      renderPass: this.renderer.renderPass, // render directly to screen
      renderTexture: null,
      onBeforeRenderPass: (commandEncoder, swapChainTexture) => {
        // draw the content into our render texture
        // if this shader pass has a renderTarget assigned (i.e. it is not a global post processing pass, but a selective pass)
        // copy its renderTarget renderTexture into its own renderTexture
        // if it's a global post processing pass, copy the context current texture into its renderTexture
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
        // if this shader pass has a renderTarget assigned (i.e. it is not a global post processing pass, but a selective pass)
        // copy back the context current texture into its renderTarget renderTexture
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

  /**
   * Remove a [shader pass]{@link ShaderPass} from our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}
   * @param shaderPass - [shader pass]{@link ShaderPass} to remove
   */
  removeShaderPass(shaderPass: ShaderPass) {
    this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
      (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
    )
  }

  /**
   * Add a [ping pong plane]{@link PingPongPlane} to our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
   * After rendering the [ping pong plane]{@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture} so we'll be able to use it as an input for the next pass
   * @param pingPongPlane
   */
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

  /**
   * Remove a [ping pong plane]{@link PingPongPlane} from our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
   * @param pingPongPlane - [ping pong plane]{@link PingPongPlane} to remove
   */
  removePingPongPlane(pingPongPlane: PingPongPlane) {
    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    )
  }

  /**
   * Here we render a [render pass entry]{@link RenderPassEntry}:
   * - Set its [render pass descriptor]{@link RenderPass#descriptor} resolve target and get it at as swap chain texture
   * - Execute [onBeforeRenderPass]{@link RenderPassEntry#onBeforeRenderPass} callback if specified
   * - Begin the [render pass]{@link GPURenderPassEncoder} using our [render pass descriptor]{@link RenderPass#descriptor}
   * - Render the single element if specified or the [render pass entry stack]{@link Stack}: draw unprojected opaque / transparent meshes first, then set [camera bind group]{@link CameraRenderer#cameraBindGroup} and draw projected opaque / transparent meshes
   * - End the [render pass]{@link GPURenderPassEncoder}
   * - Execute [onAfterRenderPass]{@link RenderPassEntry#onAfterRenderPass} callback if specified
   * - Reset [pipeline manager current pipeline]{@link PipelineManager#currentPipelineIndex}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param renderPassEntry - [entry]{@link RenderPassEntry} to render
   */
  renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry) {
    // set the pass texture to render to
    const swapChainTexture = this.renderer.setRenderPassCurrentTexture(
      renderPassEntry.renderPass,
      renderPassEntry.renderTexture?.texture
    )

    renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture)

    // now begin our actual render pass
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

  /**
   * Render our {@link Scene}
   * - Render [compute pass entries]{@link Scene#computePassEntries} first
   * - Then our [render pass entries]{@link Scene#renderPassEntries}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    this.computePassEntries.forEach((computePass) => {
      if (!computePass.canRender) return

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

  /**
   * Execute this at each render after our [command encoder]{@link GPUCommandEncoder} has been submitted.
   * Used to map writable storages buffers if needed.
   */
  onAfterCommandEncoder() {
    this.computePassEntries.forEach((computePass) => {
      computePass.setWorkGroupsResult()
    })
  }
}
