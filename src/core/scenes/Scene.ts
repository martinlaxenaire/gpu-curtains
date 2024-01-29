import { CameraRenderer, isRenderer, Renderer } from '../renderers/utils'
import { DOMProjectedMesh, ProjectedMesh, RenderedMesh } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { ComputePass } from '../computePasses/ComputePass'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { Plane } from '../../curtains/meshes/Plane'
import { RenderPass } from '../renderPasses/RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { WritableBufferBinding } from '../bindings/WritableBufferBinding'

/**
 * Meshes rendering order is dependant of their transparency setting
 */
export interface ProjectionStack {
  /** opaque Meshes will be drawn first */
  opaque: ProjectedMesh[]
  /** transparent Meshes will be drawn last */
  transparent: ProjectedMesh[]
}

/** Meshes will be stacked in 2 different objects whether they are projected (use a {@link core/camera/Camera.Camera | Camera}) or not */
export type ProjectionType = 'unProjected' | 'projected'

/**
 * Meshes will be put into two stacks of projected/unprojected transparent and opaques meshes arrays
 */
export type Stack = Record<ProjectionType, ProjectionStack>

/**
 * A RenderPassEntry object is used to group Meshes based on their rendering target
 */
export interface RenderPassEntry {
  /** {@link RenderPass} target used onto which render */
  renderPass: RenderPass
  /** {@link RenderTexture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen) */
  renderTexture: RenderTexture | null
  /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy */
  onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy */
  onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** If this {@link RenderPassEntry} needs to render only one Mesh */
  element: RenderedMesh | null
  /** If this {@link RenderPassEntry} needs to render multiple Meshes, then use a {@link Stack} object */
  stack: Stack | null
}

/** Defines all our possible render targets */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen'
/** Defines our render pass entries object */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>

/**
 * Used to by the {@link Renderer} render everything that needs to be rendered (compute passes and meshes) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 *
 * ## Render order
 *
 * - Run all the {@link ComputePass} first, sorted by their {@link ComputePass#renderOrder | renderOrder}
 * - Then render all {@link renderPassEntries} pingPong entries Meshes, sorted by their {@link PingPongPlane#renderOrder | renderOrder}
 * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} renderTarget entries:
 *   - First, the opaque unprojected Meshes (i.e. opaque {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}
 *   - Then, the transparent unprojected Meshes (i.e. transparent {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}
 *   - Then, the opaque projected Meshes (i.e. opaque {@link core/meshes/Mesh.Mesh | Mesh}, {@link DOMMesh} or {@link Plane}), sorted by their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}
 *   - Finally, the transparent projected Meshes (i.e. transparent {@link core/meshes/Mesh.Mesh | Mesh}, {@link DOMMesh} or {@link Plane}), sorted by their Z position and then their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}
 * - Finally all Meshes that need to be rendered directly to the {@link renderPassEntries} screen (the {@link Renderer} current texture), in the same order than above.
 */
export class Scene {
  /** {@link Renderer} used by this {@link Scene} */
  renderer: Renderer
  /** Array of {@link ComputePass} to render, ordered by {@link ComputePass#renderOrder | renderOrder} */
  computePassEntries: ComputePass[]
  /**
   * A {@link RenderPassEntries} object that will contain every Meshes that need to be drawn, put inside each one of our three entries type arrays: 'pingPong', 'renderTarget' and 'screen'.
   * - The {@link Scene} will first render all {@link renderPassEntries} pingPong entries Meshes
   * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} renderTarget entries
   * - Finally all Meshes that need to be rendered to the {@link renderPassEntries} screen
   */
  renderPassEntries: RenderPassEntries

  /**
   * Scene constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
   */
  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.computePassEntries = []

    this.renderPassEntries = {
      /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here */
      pingPong: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here */
      renderTarget: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. Following entries will be created for every global {@link ShaderPass} */
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
   * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
   * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test
   */
  getRenderPassEntryLength(renderPassEntry: RenderPassEntry): number {
    if (!renderPassEntry) {
      return 0
    } else {
      return renderPassEntry.element
        ? 1
        : renderPassEntry.stack.unProjected.opaque.length +
            renderPassEntry.stack.unProjected.transparent.length +
            renderPassEntry.stack.projected.opaque.length +
            renderPassEntry.stack.projected.transparent.length
    }
  }

  /**
   * Add a {@link ComputePass} to our scene {@link computePassEntries} array
   * @param computePass - {@link ComputePass} to add
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
   * Remove a {@link ComputePass} from our scene {@link computePassEntries} array
   * @param computePass - {@link ComputePass} to remove
   */
  removeComputePass(computePass: ComputePass) {
    this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid)
  }

  /**
   * Add a {@link RenderTarget} to our scene {@link renderPassEntries} renderTarget array.
   * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget RenderTexture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
   * @param renderTarget - {@link RenderTarget} to add
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
   * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} renderTarget array.
   * @param renderTarget - {@link RenderTarget} to add
   */
  removeRenderTarget(renderTarget: RenderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    )
  }

  /**
   * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} renderTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
   * @param mesh - Mesh to check
   * @returns - the corresponding render pass entry {@link Stack}
   */
  getMeshProjectionStack(mesh: ProjectedMesh): ProjectionStack {
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
   * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
   * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, position along the Z axis in case they are transparent and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
   * @param mesh - Mesh to add
   */
  addMesh(mesh: ProjectedMesh) {
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
      similarMeshes.sort(
        (a, b) => (b as DOMProjectedMesh).documentPosition.z - (a as DOMProjectedMesh).documentPosition.z
      )
    }

    // then sort by their render order
    similarMeshes.sort((a, b) => a.renderOrder - b.renderOrder)

    mesh.transparent ? (projectionStack.transparent = similarMeshes) : (projectionStack.opaque = similarMeshes)
  }

  /**
   * Remove a Mesh from our {@link Scene}
   * @param mesh - Mesh to remove
   */
  removeMesh(mesh: ProjectedMesh) {
    const projectionStack = this.getMeshProjectionStack(mesh)

    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
    }
  }

  /**
   * Add a {@link ShaderPass} to our scene {@link renderPassEntries} screen array.
   * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}
   * This also handles the {@link renderPassEntries} screen array entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
   * @param shaderPass - {@link ShaderPass} to add
   */
  addShaderPass(shaderPass: ShaderPass) {
    const onBeforeRenderPass = shaderPass.renderTarget
      ? null
      : (commandEncoder, swapChainTexture) => {
          // draw the content into our render texture
          // if it's a global post processing pass, copy the context current texture into its renderTexture
          if (shaderPass.renderTexture) {
            commandEncoder.copyTextureToTexture(
              {
                texture: swapChainTexture,
              },
              {
                texture: shaderPass.renderTexture.texture,
              },
              [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
            )
          }

          // if we want to post process the whole scene, clear render pass content
          this.renderer.postProcessingPass.setLoadOp('clear')
        }

    const onAfterRenderPass = shaderPass.renderTarget
      ? (commandEncoder, swapChainTexture) => {
          // if we render to a target, copy the result so we can chain render to textures
          if (shaderPass.renderTarget && shaderPass.renderTarget.renderTexture) {
            commandEncoder.copyTextureToTexture(
              {
                texture: swapChainTexture,
              },
              {
                texture: shaderPass.renderTarget.renderTexture.texture,
              },
              [shaderPass.renderTarget.renderTexture.size.width, shaderPass.renderTarget.renderTexture.size.height]
            )
          }
        }
      : null

    const shaderPassEntry = {
      renderPass: this.renderer.postProcessingPass, // render directly to screen
      renderTexture: null,
      onBeforeRenderPass,
      onAfterRenderPass,
      element: shaderPass,
      stack: null, // explicitly set to null
    }

    this.renderPassEntries.screen.push(shaderPassEntry)

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
   * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} screen array
   * @param shaderPass - {@link ShaderPass} to remove
   */
  removeShaderPass(shaderPass: ShaderPass) {
    this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
      (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
    )
  }

  /**
   * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
   * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}
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
   * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
   * @param pingPongPlane - {@link PingPongPlane} to remove
   */
  removePingPongPlane(pingPongPlane: PingPongPlane) {
    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    )
  }

  /**
   * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
   * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
   * @returns - the {@link RenderPassEntry} if found
   */
  getObjectRenderPassEntry(object: RenderedMesh | RenderTarget): RenderPassEntry | undefined {
    if (object instanceof RenderTarget) {
      return this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === object.renderPass.uuid)
    } else if (object instanceof PingPongPlane) {
      return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid)
    } else if (object instanceof ShaderPass) {
      return this.renderPassEntries.screen.find((entry) => entry.element?.uuid === object.uuid)
    } else {
      const entryType = object.renderTarget ? 'renderTarget' : 'screen'
      return this.renderPassEntries[entryType].find((entry) => {
        return [
          ...entry.stack.unProjected.opaque,
          ...entry.stack.unProjected.transparent,
          ...entry.stack.projected.opaque,
          ...entry.stack.projected.transparent,
        ].some((mesh) => mesh.uuid === object.uuid)
      })
    }
  }

  /**
   * Here we render a {@link RenderPassEntry}:
   * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
   * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
   * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
   * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link CameraRenderer#cameraBindGroup | camera bind group} and draw projected opaque / transparent meshes
   * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
   * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
   * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param renderPassEntry - {@link RenderPassEntry} to render
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
    !this.renderer.production &&
      pass.pushDebugGroup(
        renderPassEntry.element
          ? `${renderPassEntry.element.options.label} render pass using ${renderPassEntry.renderPass.options.label} descriptor`
          : `Render stack pass using ${renderPassEntry.renderPass.options.label}${
              renderPassEntry.renderTexture ? ' onto ' + renderPassEntry.renderTexture.options.label : ''
            }`
      )

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

    !this.renderer.production && pass.popDebugGroup()
    pass.end()

    renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture)

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Render our {@link Scene}
   * - Render {@link computePassEntries} first
   * - Then our {@link renderPassEntries}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    this.computePassEntries.forEach((computePass) => {
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
        if (!this.getRenderPassEntryLength(renderPassEntry)) return

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
   * Logs all the main commands executed during each {@link Scene#render | Scene render} calls.
   */
  logRenderCommands() {
    const renderCommands = []

    this.computePassEntries.forEach((computePass) => {
      renderCommands.push({
        command: 'Render ComputePass',
        content: computePass.options.label,
      })

      computePass.material.bindGroups.forEach((bindGroup) => {
        bindGroup.bufferBindings.forEach((binding: WritableBufferBinding) => {
          if (binding.shouldCopyResult) {
            renderCommands.push({
              command: `Copy buffer to buffer`,
              source: `${binding.name} buffer`,
              destination: `${binding.name} result buffer`,
            })
          }
        })
      })
    })

    for (const renderPassEntryType in this.renderPassEntries) {
      let passDrawnCount = 0

      this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        // early bail if there's nothing to draw
        if (!this.getRenderPassEntryLength(renderPassEntry)) return

        const destination = renderPassEntry.renderTexture
          ? `${renderPassEntry.renderTexture.options.label}`
          : 'Context current texture'

        let descriptor = renderPassEntry.renderPass.options.label

        const operations = {
          loadOp:
            renderPassEntryType === 'screen' && passDrawnCount > 0 ? 'load' : renderPassEntry.renderPass.options.loadOp,
          depthLoadOp: undefined,
        }

        if (renderPassEntry.renderPass.options.depth) {
          operations.depthLoadOp = renderPassEntry.renderPass.options.depthLoadOp
        }

        passDrawnCount++

        if (renderPassEntry.element) {
          if (renderPassEntry.element.type === 'ShaderPass' && !renderPassEntry.element.renderTarget) {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.options.label} renderTexture`,
            })

            operations.loadOp = 'clear'
          }

          descriptor += ' ' + JSON.stringify(operations)

          renderCommands.push({
            command: `Render ${renderPassEntry.element.type}`,
            source: renderPassEntry.element.options.label,
            destination,
            descriptor,
          })

          if (renderPassEntry.element.type === 'ShaderPass' && renderPassEntry.element.renderTarget) {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.renderTarget.options.label} renderTexture`,
            })
          } else if (renderPassEntry.element.type === 'PingPongPlane') {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.renderTexture.options.label}`,
            })
          }
        } else if (renderPassEntry.stack) {
          descriptor += ' ' + JSON.stringify(operations)

          for (const stackType in renderPassEntry.stack) {
            for (const objectType in renderPassEntry.stack[stackType]) {
              if (renderPassEntry.stack[stackType][objectType].length) {
                renderCommands.push({
                  command: `Render stack (${stackType} ${objectType} objects)`,
                  source: renderPassEntry.stack[stackType][objectType],
                  destination,
                  descriptor,
                })
              }
            }
          }
        }
      })
    }

    console.table(renderCommands)
  }
}
