import { isRenderer, Renderer } from '../renderers/utils'
import { SceneStackedMesh, RenderedMesh, ProjectedMesh, SceneStackedObject } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../extras/meshes/PingPongPlane'
import { ComputePass } from '../computePasses/ComputePass'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { RenderPass } from '../renderPasses/RenderPass'
import { Texture } from '../textures/Texture'
import { Object3D } from '../objects3D/Object3D'
import { Vec3 } from '../../math/Vec3'
import { RenderBundle } from '../renderPasses/RenderBundle'
import { throwWarning } from '../../utils/utils'
import { GPUCameraRenderer } from '../renderers/GPUCameraRenderer'

// used to sort transparent meshes
const camPosA = new Vec3()
const camPosB = new Vec3()
const posA = new Vec3()
const posB = new Vec3()

/**
 * Meshes rendering order is dependant of their transparency setting.
 */
export interface ProjectionStack {
  /** opaque Meshes or {@link RenderBundle} will be drawn first */
  opaque: SceneStackedObject[]
  /** transparent Meshes or {@link RenderBundle} will be drawn last */
  transparent: SceneStackedObject[]
}

/** Meshes or render bundles will be stacked in 2 different objects whether they are projected (use a {@link core/cameras/Camera.Camera | Camera}) or not. */
export type ProjectionType = 'unProjected' | 'projected'

/** Meshes or render bundles will be put into two stacks of projected/unprojected transparent and opaques objects arrays. */
export type Stack = Record<ProjectionType, ProjectionStack>

/**
 * A RenderPassEntry object is used to group Meshes or {@link RenderBundle} based on their rendering target.
 */
export interface RenderPassEntry {
  /** Optional label for this {@link RenderPassEntry}. */
  label?: string
  /** {@link RenderPass} target used onto which render. */
  renderPass: RenderPass
  /** {@link Texture} to render to if any (if not specified then this {@link RenderPassEntry} Meshes will be rendered directly to screen). */
  renderTexture: Texture | null
  /** Optional function to execute just before rendering the Meshes, useful for eventual texture copy. */
  onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** Optional function to execute just after rendering the Meshes, useful for eventual texture copy. */
  onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  /** Optional function that can be used to manually create a {@link GPURenderPassEncoder} and create a custom rendering behaviour instead of the regular one. Used internally to render shadows. */
  useCustomRenderPass: ((commandEncoder?: GPUCommandEncoder) => void) | null

  /** If this {@link RenderPassEntry} needs to render only one Mesh. */
  element: PingPongPlane | ShaderPass | null
  /** If this {@link RenderPassEntry} needs to render multiple Meshes or {@link RenderBundle}, then use a {@link Stack} object. */
  stack: Stack | null
}

/** Defines all our possible render targets. */
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'prePass' | 'screen' | 'postProPass'
/** Defines our render pass entries object. */
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>

/**
 * Used to by the {@link Renderer} to render everything that needs to be rendered (compute passes, meshes and/or render bundles) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
 *
 * ## Render order
 *
 * - Run all the {@link ComputePass} first, sorted by their {@link ComputePass#renderOrder | renderOrder}
 * - Then render all {@link renderPassEntries} `pingPong` entries Meshes or {@link RenderBundle}, sorted by their {@link PingPongPlane#renderOrder | renderOrder}.
 * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} outputTarget entries:
 *   - First, the opaque unprojected Meshes (i.e. opaque {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}  or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
 *   - Then, the transparent unprojected Meshes (i.e. transparent {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane} or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
 *   - Then render all {@link renderPassEntries} `prePass` entries {@link ShaderPass}, sorted by their {@link ShaderPass#renderOrder | renderOrder}. This would be mainly used for "blit" passes rendered before the content that needs to be actually rendered on the main screen buffer.
 *   - Then, the opaque projected Meshes (i.e. opaque {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane}) or {@link RenderBundle}, sorted by their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
 *   - Finally, the transparent projected Meshes (i.e. transparent {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane} or {@link RenderBundle}), sorted by their Z position and then their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
 * - Next, all the Meshes that need to be rendered directly to the {@link renderPassEntries} screen main buffer (the {@link Renderer} current texture), in the same order than above. The `screen` {@link renderPassEntries} array can have multiple entries, allowing you to render first a given set of meshes, the perform any operation (like getting the outputted content) before rendering another set of meshes.
 * - Finally, all the post processing {@link ShaderPass} in the `postProPass` {@link renderPassEntries} array.
 */
export class Scene extends Object3D {
  /** {@link Renderer} used by this {@link Scene} */
  renderer: Renderer
  /** Array of {@link ComputePass} to render, ordered by {@link ComputePass#renderOrder | renderOrder} */
  computePassEntries: ComputePass[]
  /**
   * A {@link RenderPassEntries} object that will contain every Meshes or {@link RenderBundle} that need to be drawn, put inside each one of our three entries type arrays: `pingPong`, `renderTarget` and `screen`.
   * - The {@link Scene} will first render all {@link renderPassEntries} pingPong entries Meshes.
   * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} renderTarget entries.
   * - Finally all Meshes that need to be rendered to the {@link renderPassEntries} screen.
   */
  renderPassEntries: RenderPassEntries

  /**
   * Scene constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
   */
  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    super()

    renderer = isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.computePassEntries = []

    this.renderPassEntries = {
      /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here */
      pingPong: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here */
      renderTarget: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} containing {@link ShaderPass} that will render directly to the screen before rendering any other pass to the screen. Useful to perform "blit" pass before actually rendering the usual scene content. */
      prePass: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first and default entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. You can create following entries for custom scene rendering management process. */
      screen: [] as RenderPassEntry[],
      /**Array of {@link RenderPassEntry} containing post processing {@link ShaderPass} that will render directly to the screen after everything has been drawn. */
      postProPass: [] as RenderPassEntry[],
    }
  }

  /**
   * Create a new {@link RenderPassEntry} in the {@link renderPassEntries} `screen` array.
   * @param label - Optional label to use for this {@link RenderPassEntry}.
   * @param order - Optional order into which insert this {@link renderPassEntries} `screen` array. A positive number means at the end of the array, a negative number means at the beginning. Default to `1`.
   * @returns - The new {@link RenderPassEntry}.
   */
  createScreenPassEntry(label = '', order = 1): RenderPassEntry {
    const screenPassEntry: RenderPassEntry = {
      label,
      renderPass: this.renderer.renderPass,
      renderTexture: null,
      onBeforeRenderPass: null,
      onAfterRenderPass: null,
      useCustomRenderPass: null,
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
    }

    if (order >= 0) {
      this.renderPassEntries.screen.push(screenPassEntry)
    } else {
      this.renderPassEntries.screen.unshift(screenPassEntry)
    }

    return screenPassEntry
  }

  /**
   * Set the main {@link Renderer} render pass entry.
   */
  setMainRenderPassEntry() {
    // add our default scene screen entry
    this.createScreenPassEntry('Main scene screen render pass')
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
        ? renderPassEntry.element.visible
          ? 1
          : 0
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
   * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
   * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
   * @param renderTarget - {@link RenderTarget} to add
   */
  addRenderTarget(renderTarget: RenderTarget) {
    // if RT is not already in the render pass entries
    if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
      this.renderPassEntries.renderTarget.push({
        label: renderTarget.options.label,
        renderPass: renderTarget.renderPass,
        renderTexture: renderTarget.renderTexture,
        onBeforeRenderPass: null,
        onAfterRenderPass: null,
        useCustomRenderPass: null,
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
   * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
   * @param renderTarget - {@link RenderTarget} to add
   */
  removeRenderTarget(renderTarget: RenderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    )
  }

  /**
   * Get the {@link RenderPassEntry} in the {@link renderPassEntries} `renderTarget` array (or `screen` array if no {@link RenderTarget} is passed) corresponding to the given {@link RenderTarget}.
   * @param renderTarget - {@link RenderTarget} to use to retrieve the {@link RenderPassEntry} if any.
   * @returns - {@link RenderPassEntry} found.
   */
  getRenderTargetPassEntry(renderTarget: RenderTarget | null = null): RenderPassEntry {
    return renderTarget
      ? this.renderPassEntries.renderTarget.find(
          (passEntry) => passEntry.renderPass.uuid === renderTarget.renderPass.uuid
        )
      : this.renderPassEntries.screen.find((passEntry) => passEntry.renderPass.uuid === this.renderer.renderPass.uuid)
  }

  /**
   * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
   * @param mesh - Mesh to check
   * @returns - the corresponding render pass entry {@link Stack}
   */
  getMeshProjectionStack(mesh: RenderedMesh): ProjectionStack {
    // first get correct render pass enty and stack
    const renderPassEntry = mesh.options.useCustomScenePassEntry
      ? mesh.options.useCustomScenePassEntry
      : 'transmissive' in mesh.options && mesh.options.transmissive
      ? (this.renderer as GPUCameraRenderer).transmissionTarget.passEntry
      : this.getRenderTargetPassEntry(mesh.outputTarget)

    const { stack } = renderPassEntry

    return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected
  }

  /**
   * Order a {@link SceneStackedObject} array by using the {@link core/meshes/Mesh.Mesh.renderOrder | renderOrder} or {@link core/meshes/Mesh.Mesh.index | index} properties.
   * @param stack - {@link SceneStackedObject} to sort, filled with {@link RenderedMesh} or {@link RenderBundle}.
   */
  orderStack(stack: SceneStackedObject[]) {
    // sort by their render order or natural index
    stack.sort((a, b) => {
      return a.renderOrder - b.renderOrder || a.index - b.index
    })
  }

  /**
   * Test whether a {@link SceneStackedObject} is a {@link RenderBundle} or not.
   * @param object - Object to test.
   * @returns - Whether the object is a {@link RenderBundle} or not.
   */
  isStackObjectRenderBundle(object: SceneStackedObject): object is RenderBundle {
    return object.type === 'RenderBundle'
  }

  /**
   * Add a {@link SceneStackedMesh} to the given {@link RenderTarget} corresponding {@link RenderPassEntry}.
   * @param mesh - {@link SceneStackedMesh} to add.
   * @param renderTarget - {@link RenderTarget} to get the {@link RenderPassEntry} from. If not set, will add to the first {@link renderPassEntries} `screen` array entry.
   */
  addMeshToRenderTargetStack(mesh: SceneStackedMesh, renderTarget: RenderTarget | null = null) {
    // first get correct render pass enty and stack
    const renderPassEntry = this.getRenderTargetPassEntry(renderTarget)

    const { stack } = renderPassEntry

    const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected
    const isTransparent = !!mesh.transparent

    // rebuild stack
    const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque

    similarMeshes.push(mesh)

    this.orderStack(similarMeshes)
  }

  /**
   * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
   * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
   * @param mesh - Mesh to add
   */
  addMesh(mesh: SceneStackedMesh) {
    if (mesh.renderBundle) {
      mesh.renderBundle.addMesh(mesh, mesh.outputTarget ? mesh.outputTarget.renderPass : this.renderer.renderPass)
    }

    const { useProjection } = mesh.material.options.rendering

    if (!mesh.renderBundle) {
      const projectionStack = this.getMeshProjectionStack(mesh)
      const isTransparent = !!mesh.transparent

      // rebuild stack
      const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque

      similarMeshes.push(mesh)

      this.orderStack(similarMeshes)
    }

    if ('parent' in mesh && !mesh.parent && useProjection) {
      mesh.parent = this
    }
  }

  /**
   * Remove a Mesh from our {@link Scene}.
   * @param mesh - Mesh to remove.
   */
  removeMesh(mesh: SceneStackedMesh) {
    if (mesh.renderBundle) {
      mesh.renderBundle.removeMesh(mesh, false)
    } else {
      const projectionType = mesh.material.options.rendering.useProjection ? 'projected' : 'unProjected'
      const isTransparent = !!mesh.transparent
      const transparencyType = isTransparent ? 'transparent' : 'opaque'

      // remove from all render pass entries
      // as a mesh can be drawn multiple times
      for (const renderPassEntries of Object.values(this.renderPassEntries)) {
        renderPassEntries.forEach((renderPassEntry) => {
          if (renderPassEntry.stack) {
            renderPassEntry.stack[projectionType][transparencyType] = renderPassEntry.stack[projectionType][
              transparencyType
            ].filter((m) => m.uuid !== mesh.uuid)
          }
        })
      }
    }

    if ('transmissive' in mesh.options && mesh.options.transmissive) {
      const transmissivePassEntry = (this.renderer as GPUCameraRenderer).transmissionTarget.passEntry
      const nbTransmissiveObjects = transmissivePassEntry ? this.getRenderPassEntryLength(transmissivePassEntry) : 0

      if (nbTransmissiveObjects === 0) {
        ;(this.renderer as GPUCameraRenderer).destroyTransmissionTarget()
      }
    }

    if ('parent' in mesh && mesh.parent && mesh.parent.object3DIndex === this.object3DIndex) {
      mesh.parent = null
    }
  }

  /**
   * Add a {@link RenderBundle} to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
   * @param renderBundle - {@link RenderBundle} to add.
   * @param projectionStack - {@link ProjectionStack} onto which to add the {@link RenderBundle}.
   */
  addRenderBundle(renderBundle: RenderBundle, projectionStack: ProjectionStack) {
    // rebuild stack
    const similarObjects = !!renderBundle.transparent ? projectionStack.transparent : projectionStack.opaque

    similarObjects.push(renderBundle)

    this.orderStack(similarObjects)
  }

  /**
   * Remove a {@link RenderBundle} from our {@link Scene}.
   * @param renderBundle - {@link RenderBundle} to remove.
   */
  removeRenderBundle(renderBundle: RenderBundle) {
    const isProjected = !!renderBundle.useProjection
    const projectionType = isProjected ? 'projected' : 'unProjected'
    const isTransparent = !!renderBundle.transparent
    const transparencyType = isTransparent ? 'transparent' : 'opaque'

    // first get correct render pass enty and stack
    const renderPassEntry = this.renderPassEntries.renderTarget.find(
      (passEntry) => passEntry.renderPass.uuid === renderBundle.options.renderPass?.uuid
    )

    if (renderPassEntry) {
      const { stack } = renderPassEntry

      const projectionStack = stack[projectionType]

      projectionStack[transparencyType] = projectionStack[transparencyType].filter(
        (bundle) => bundle.uuid !== renderBundle.uuid
      )
    } else {
      // remove from all render pass screen entries
      this.renderPassEntries.screen.forEach((renderPassEntry) => {
        if (renderPassEntry.stack) {
          renderPassEntry.stack[projectionType][transparencyType] = renderPassEntry.stack[projectionType][
            transparencyType
          ].filter((m) => m.uuid !== renderBundle.uuid)
        }
      })
    }
  }

  /**
   * Add a {@link ShaderPass} to our scene {@link renderPassEntries} `prePass` or `postProPass` array.
   * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}.
   * This also handles the {@link renderPassEntries} `postProPass` array entries order: We will first draw selective passes and then finally global post processing passes.
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
   * @param shaderPass - {@link ShaderPass} to add.
   */
  addShaderPass(shaderPass: ShaderPass) {
    const onBeforeRenderPass =
      shaderPass.inputTarget || shaderPass.outputTarget
        ? null
        : (commandEncoder, swapChainTexture) => {
            // draw the content into our render texture
            // if it's a global postprocessing pass, copy the context current texture into its renderTexture
            // we don't need to do that if it has an inputTarget
            // because in this case its renderTexture is already a copy of the render target content
            if (shaderPass.renderTexture && swapChainTexture) {
              this.renderer.copyGPUTextureToTexture(swapChainTexture, shaderPass.renderTexture, commandEncoder)
            }

            // if we want to post process the whole scene, clear render pass content
            this.renderer.postProcessingPass.setLoadOp('clear')
          }

    const onAfterRenderPass =
      !shaderPass.outputTarget && shaderPass.options.copyOutputToRenderTexture
        ? (commandEncoder, swapChainTexture) => {
            // if we rendered to the screen,
            // copy the context current texture result back into the shaderPass renderTexture
            if (shaderPass.renderTexture && swapChainTexture) {
              this.renderer.copyGPUTextureToTexture(swapChainTexture, shaderPass.renderTexture, commandEncoder)
            }
          }
        : null

    const outputPass = shaderPass.outputTarget
      ? shaderPass.outputTarget.renderPass
      : !shaderPass.options.isPrePass
      ? this.renderer.postProcessingPass
      : this.renderer.renderPass

    const label = shaderPass.options.isPrePass
      ? shaderPass.options.label + ' scene pre pass'
      : shaderPass.options.label + ' scene post processing pass'

    const shaderPassEntry = {
      label,
      // use output target or postprocessing render pass
      renderPass: outputPass,
      // render to output target renderTexture or directly to screen
      renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
      onBeforeRenderPass,
      onAfterRenderPass,
      useCustomRenderPass: null,
      element: shaderPass,
      stack: null, // explicitly set to null
    }

    if (shaderPass.renderBundle) {
      const { renderBundle } = shaderPass

      if (renderBundle.meshes.size >= 1) {
        throwWarning(
          `${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 ShaderPass to a render bundle. This ShaderPass will not be added: ${shaderPass.options.label}`
        )

        shaderPass.renderBundle = null
      } else {
        renderBundle.addMesh(shaderPass, outputPass)
      }
    }

    if (!shaderPass.options.isPrePass) {
      this.renderPassEntries.postProPass.push(shaderPassEntry)

      // postProPass passes are sorted by 2 criteria
      // first we draw render passes that have an output target, ordered by renderOrder
      // then we draw our full postprocessing pass, ordered by renderOrder
      this.renderPassEntries.postProPass.sort((a, b) => {
        const isPostProA = a.element && !a.element.outputTarget
        const renderOrderA = a.element ? a.element.renderOrder : 0
        const indexA = a.element ? a.element.index : 0

        const isPostProB = b.element && !b.element.outputTarget
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
    } else {
      this.renderPassEntries.prePass.push(shaderPassEntry)
      // sort by their render order
      this.renderPassEntries.prePass.sort(
        (a, b) => a.element.renderOrder - b.element.renderOrder || a.element.index - b.element.index
      )
    }
  }

  /**
   * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} `prePass` or `postProPass` array.
   * @param shaderPass - {@link ShaderPass} to remove.
   */
  removeShaderPass(shaderPass: ShaderPass) {
    if (shaderPass.renderBundle) {
      shaderPass.renderBundle.empty()
    }

    if (!shaderPass.options.isPrePass) {
      this.renderPassEntries.postProPass = this.renderPassEntries.postProPass.filter(
        (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
      )
    } else {
      this.renderPassEntries.prePass = this.renderPassEntries.prePass.filter(
        (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
      )
    }
  }

  /**
   * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
   * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass.
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}
   * @param pingPongPlane
   */
  addPingPongPlane(pingPongPlane: PingPongPlane) {
    this.renderPassEntries.pingPong.push({
      label: pingPongPlane.options.label + ' scene pass',
      renderPass: pingPongPlane.outputTarget.renderPass,
      renderTexture: pingPongPlane.outputTarget.renderTexture,
      onBeforeRenderPass: null,
      onAfterRenderPass: (commandEncoder, swapChainTexture) => {
        // Copy the rendering results from the swapChainTexture into our |pingPongPlane texture|.
        this.renderer.copyGPUTextureToTexture(swapChainTexture, pingPongPlane.renderTexture, commandEncoder)
      },
      useCustomRenderPass: null,
      element: pingPongPlane,
      stack: null, // explicitly set to null
    } as RenderPassEntry)

    if (pingPongPlane.renderBundle) {
      const { renderBundle } = pingPongPlane

      if (renderBundle.meshes.size >= 1) {
        throwWarning(
          `${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 PingPongPlane to a render bundle. This PingPongPlane will not be added: ${pingPongPlane.options.label}`
        )

        pingPongPlane.renderBundle = null
      } else {
        renderBundle.addMesh(pingPongPlane, pingPongPlane.outputTarget.renderPass)
      }
    }

    // sort by their render order
    this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder)
  }

  /**
   * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
   * @param pingPongPlane - {@link PingPongPlane} to remove.
   */
  removePingPongPlane(pingPongPlane: PingPongPlane) {
    if (pingPongPlane.renderBundle) {
      pingPongPlane.renderBundle.empty()
    }

    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    )
  }

  /**
   * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
   * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
   * @returns - the {@link RenderPassEntry} if found.
   */
  getObjectRenderPassEntry(object: RenderedMesh | RenderTarget): RenderPassEntry | undefined {
    if (object.type === 'RenderTarget') {
      return this.renderPassEntries.renderTarget.find(
        (entry) => entry.renderPass.uuid === (object as RenderTarget).renderPass.uuid
      )
    } else if (object.type === 'PingPongPlane') {
      return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid)
    } else if (object.type === 'ShaderPass') {
      return this.renderPassEntries.screen.find((entry) => entry.element?.uuid === object.uuid)
    } else {
      const entryType = (object as RenderedMesh).outputTarget ? 'renderTarget' : 'screen'

      if ((object as RenderedMesh).renderBundle) {
        return this.renderPassEntries[entryType].find((entry) => {
          return [
            ...entry.stack.unProjected.opaque,
            ...entry.stack.unProjected.transparent,
            ...entry.stack.projected.opaque,
            ...entry.stack.projected.transparent,
          ]
            .filter((object) => object.type === 'RenderBundle')
            .some((bundle: RenderBundle) => {
              return bundle.meshes.get(object.uuid)
            })
        })
      } else {
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
  }

  /**
   * Sort transparent projected meshes by their render order or distance to the camera (farther meshes should be drawn first).
   * @param meshes - transparent projected meshes array to sort.
   */
  sortTransparentMeshes(meshes: Array<ProjectedMesh | RenderBundle>) {
    meshes.sort((meshA, meshB) => {
      if (meshA.renderOrder !== meshB.renderOrder) {
        return meshA.renderOrder - meshB.renderOrder
      }

      if (this.isStackObjectRenderBundle(meshA) || this.isStackObjectRenderBundle(meshB)) {
        return meshA.renderOrder - meshB.renderOrder
      }

      // apply world matrices to objects
      meshA.geometry
        ? posA.copy(meshA.geometry.boundingBox.center).applyMat4(meshA.worldMatrix)
        : meshA.worldMatrix.getTranslation(posA)

      meshB.geometry
        ? posB.copy(meshB.geometry.boundingBox.center).applyMat4(meshB.worldMatrix)
        : meshB.worldMatrix.getTranslation(posB)

      // apply scale to bounding sphere radius
      const radiusA = meshA.geometry ? meshA.geometry.boundingBox.radius * meshA.worldMatrix.getMaxScaleOnAxis() : 0
      const radiusB = meshB.geometry ? meshB.geometry.boundingBox.radius * meshB.worldMatrix.getMaxScaleOnAxis() : 0

      return (
        meshB.camera.worldMatrix.getTranslation(camPosB).distance(posB) -
        radiusB -
        (meshA.camera.worldMatrix.getTranslation(camPosA).distance(posA) - radiusA)
      )
    })
  }

  /**
   * Here we render a {@link RenderPassEntry}:
   * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
   * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
   * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
   * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes
   * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
   * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
   * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param renderPassEntry - {@link RenderPassEntry} to render
   */
  renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry) {
    // set the pass texture to render to
    const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture)

    renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture)

    if (renderPassEntry.useCustomRenderPass) {
      renderPassEntry.useCustomRenderPass(commandEncoder)
    } else {
      // now begin our actual render pass
      const pass = renderPassEntry.renderPass.beginRenderPass(commandEncoder)

      if (!this.renderer.production) {
        pass.pushDebugGroup(
          renderPassEntry.element
            ? `${renderPassEntry.element.options.label} render pass using ${renderPassEntry.renderPass.options.label} descriptor`
            : `Render stack pass using ${renderPassEntry.renderPass.options.label}${
                renderPassEntry.renderTexture ? ' onto ' + renderPassEntry.renderTexture.options.label : ''
              }`
        )
      }

      // pass entries can have a single element or a stack
      if (renderPassEntry.element) {
        if (renderPassEntry.element.renderBundle) {
          renderPassEntry.element.renderBundle.render(pass)
        } else {
          renderPassEntry.element.render(pass)
        }
      } else if (renderPassEntry.stack) {
        // draw unProjected regular meshes
        for (const mesh of renderPassEntry.stack.unProjected.opaque) {
          mesh.render(pass)
        }
        for (const mesh of renderPassEntry.stack.unProjected.transparent) {
          mesh.render(pass)
        }

        // then draw projected meshes
        if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
          // opaque
          for (const mesh of renderPassEntry.stack.projected.opaque) {
            mesh.render(pass)
          }

          // transparent
          this.sortTransparentMeshes(renderPassEntry.stack.projected.transparent as Array<ProjectedMesh | RenderBundle>)

          for (const mesh of renderPassEntry.stack.projected.transparent) {
            mesh.render(pass)
          }
        }
      }

      if (!this.renderer.production) pass.popDebugGroup()

      pass.end()
    }

    renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture)

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Before actually rendering the scene, update matrix stack and frustum culling checks. Batching these calls greatly improve performance. Called by the {@link renderer} before rendering.
   */
  onBeforeRender() {
    // execute lights onBeforeRender callback if needed
    if ('lights' in this.renderer) {
      this.renderer.lights.forEach((light) => {
        light.onBeforeRenderScene()
      })
    }

    // execute meshes onBeforeRender callback if needed
    this.renderer.meshes.forEach((mesh) => {
      mesh.onBeforeRenderScene()
    })

    this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.update())

    // update matrices
    this.updateMatrixStack()

    this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.onAfterUpdate())

    // TODO store projected meshes only?
    // frustum culling check if needed
    for (const mesh of this.renderer.meshes) {
      if ('checkFrustumCulling' in mesh && mesh.visible) {
        mesh.checkFrustumCulling()
      }
    }
  }

  /**
   * Render our {@link Scene}
   * - Execute {@link onBeforeRender} first
   * - Then render {@link computePassEntries}
   * - And finally render our {@link renderPassEntries}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    for (const computePass of this.computePassEntries) {
      const pass = commandEncoder.beginComputePass()

      if (!this.renderer.production) pass.pushDebugGroup(`${computePass.options.label}: begin compute pass`)

      computePass.render(pass)

      if (!this.renderer.production) pass.popDebugGroup()

      pass.end()

      computePass.copyBufferToResult(commandEncoder)

      this.renderer.pipelineManager.resetCurrentPipeline()
    }

    for (const renderPassEntryType in this.renderPassEntries) {
      // force clearing the renderPass depth buffer before drawing any post processing pass
      // reset it even if there's no post processing pass
      if (renderPassEntryType === 'postProPass') {
        this.renderer.renderPass.setDepthLoadOp('clear')
      }

      let passDrawnCount = 0

      this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        // early bail if there's nothing to draw
        if (!this.getRenderPassEntryLength(renderPassEntry)) return

        const isSubesequentScreenPass =
          renderPassEntryType === 'screen' && (passDrawnCount !== 0 || this.renderPassEntries.prePass.length)

        const loadContent =
          renderPassEntryType === 'postProPass' ||
          (renderPassEntryType === 'prePass' && passDrawnCount !== 0) ||
          isSubesequentScreenPass

        // if we're drawing to screen and it's not our first pass, load result from previous passes
        // post processing scene pass will clear content inside onBeforeRenderPass anyway
        renderPassEntry.renderPass.setLoadOp(loadContent ? 'load' : 'clear')
        if (isSubesequentScreenPass) renderPassEntry.renderPass.setDepthLoadOp('load')

        passDrawnCount++

        this.renderSinglePassEntry(commandEncoder, renderPassEntry)
      })
    }
  }
}
