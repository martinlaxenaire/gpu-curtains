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
import { Mesh } from '../meshes/Mesh'

// used to sort transparent meshes
const camPosA = new Vec3()
const camPosB = new Vec3()
const posA = new Vec3()
const posB = new Vec3()

/**
 * Meshes rendering order is dependant of their transparency setting.
 */
export interface ProjectionStack {
  /** opaque Meshes or {@link RenderBundle} will be drawn first. */
  opaque: SceneStackedObject[]
  /** transparent Meshes or {@link RenderBundle} will be drawn last. */
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
export type RenderPassEntriesType =
  | 'pingPong'
  | 'renderTarget'
  | 'prePass'
  | 'screen'
  | 'postRenderTarget'
  | 'postProPass'
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
   * A {@link RenderPassEntries} object that will contain every Meshes or {@link RenderBundle} that need to be drawn, put inside each one of our six entries type arrays: `pingPong`, `renderTarget`, `prePass`, `screen`, `postRenderTarget` and `postProPass`.
   * - The {@link Scene} will first render all {@link renderPassEntries} pingPong entries Meshes.
   * - Then all Meshes that need to be rendered into specific {@link renderPassEntries} renderTarget entries.
   * - Finally all Meshes that need to be rendered to the {@link renderPassEntries} screen.
   */
  renderPassEntries: RenderPassEntries

  /**
   * Keep track of whether the next render pass should set its `loadOp` to `'load'` when rendering.
   * @private
   */
  #shouldLoadColors: boolean
  /**
   * Keep track of whether the next render pass should set its `depthLoadOp` to `'load'` when rendering.
   * @private
   */
  #shouldLoadDepth: boolean
  /**
   * Keep track of whether the next render pass should set its `storeOp` to `'store'` when rendering.
   * @private
   */
  #shouldStoreColors: boolean
  /**
   * Keep track of whether the next render pass should set its `depthStoreOp` to `'store'` when rendering.
   * @private
   */
  #shouldStoreDepth: boolean

  #currentRenderPass: null | GPURenderPassEncoder
  #previousTextureId: null | string
  #nextTextureId: null | string
  #texturesIds: Set<string>
  #depthTexturesIds: Set<string>

  // TODO
  #renderingState: Record<string, any>

  /**
   * Scene constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}.
   */
  constructor({ renderer }: { renderer: Renderer | GPUCurtains }) {
    super()

    renderer = isRenderer(renderer, 'Scene')

    this.renderer = renderer

    this.#shouldLoadColors = false
    this.#shouldLoadDepth = false
    this.#shouldStoreColors = false
    this.#shouldStoreDepth = false

    this.#currentRenderPass = null
    this.#previousTextureId = null
    this.#nextTextureId = null
    this.#texturesIds = new Set()
    this.#depthTexturesIds = new Set()

    this.#renderingState = {
      // load flags
      loadColors: false,
      loadDepth: false,
      // store flages
      storeColors: false,
      storeDepth: false,
      // current pass
      currentRenderPass: null,
      // color attachments ids
      previousTextureId: null,
      nextTextureId: null,
      uniqueTexturesIds: new Set(),
      frameTexturesIds: [],
      // depth ids
      uniqueDepthTexturesIds: new Set(),
      frameDepthTexturesIds: [],
    }

    this.computePassEntries = []

    this.renderPassEntries = {
      /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here. */
      pingPong: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget} before rendering to the screen. Each {@link RenderTarget} not using `isPostTarget` option will be added as a distinct {@link RenderPassEntry} here. */
      renderTarget: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} containing {@link ShaderPass} that will render directly to the screen before rendering any other pass to the screen. Useful to perform "blit" pass before actually rendering the usual scene content. */
      prePass: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first and default entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. You can create following entries for custom scene rendering management process. */
      screen: [] as RenderPassEntry[],
      /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget} after the screen passes have been rendered. Each {@link RenderTarget} using the `isPostTarget` option will be added as a distinct {@link RenderPassEntry} here. */
      postRenderTarget: [] as RenderPassEntry[],
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
   * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test.
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
   * Add a {@link ComputePass} to our scene {@link computePassEntries} array.
   * @param computePass - {@link ComputePass} to add.
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
   * Remove a {@link ComputePass} from our scene {@link computePassEntries} array.
   * @param computePass - {@link ComputePass} to remove.
   */
  removeComputePass(computePass: ComputePass) {
    this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid)
  }

  /**
   * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
   * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}.
   * @param renderTarget - {@link RenderTarget} to add.
   */
  addRenderTarget(renderTarget: RenderTarget) {
    const targetPassEntries = renderTarget.options.isPostTarget
      ? this.renderPassEntries.postRenderTarget
      : this.renderPassEntries.renderTarget

    // if RT is not already in the render pass entries
    if (!targetPassEntries.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid)) {
      targetPassEntries.push({
        label: renderTarget.options.label
          ? `${renderTarget.options.label} pass entry`
          : `RenderTarget ${renderTarget.uuid} pass entry`,
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
  }

  /**
   * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
   * @param renderTarget - {@link RenderTarget} to remove.
   */
  removeRenderTarget(renderTarget: RenderTarget) {
    const targetPassEntries = renderTarget.options.isPostTarget
      ? this.renderPassEntries.postRenderTarget
      : this.renderPassEntries.renderTarget

    const filteredEntries = targetPassEntries.filter((entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid)

    if (renderTarget.options.isPostTarget) {
      this.renderPassEntries.postRenderTarget = filteredEntries
    } else {
      this.renderPassEntries.renderTarget = filteredEntries
    }
  }

  /**
   * Get the {@link RenderPassEntry} in the {@link renderPassEntries} `renderTarget` array (or `screen` array if no {@link RenderTarget} is passed) corresponding to the given {@link RenderTarget}.
   * @param renderTarget - {@link RenderTarget} to use to retrieve the {@link RenderPassEntry} if any.
   * @returns - {@link RenderPassEntry} found.
   */
  getRenderTargetPassEntry(renderTarget: RenderTarget | null = null): RenderPassEntry {
    if (renderTarget) {
      const targetPassEntries = renderTarget.options.isPostTarget
        ? this.renderPassEntries.postRenderTarget
        : this.renderPassEntries.renderTarget

      return targetPassEntries.find((passEntry) => passEntry.renderPass.uuid === renderTarget.renderPass.uuid)
    } else {
      return this.renderPassEntries.screen.find(
        (passEntry) => passEntry.renderPass.uuid === this.renderer.renderPass.uuid
      )
    }
  }

  /**
   * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not.
   * @param mesh - Mesh to check.
   * @returns - The corresponding render pass entry {@link Stack}.
   */
  getMeshProjectionStack(mesh: RenderedMesh): ProjectionStack {
    const isTransparent = mesh.transparent
    const hasRendererTransmissionPassEntry =
      'transmissionTarget' in this.renderer &&
      this.renderer.transmissionTarget &&
      this.renderer.transmissionTarget.passEntry
    const isTransmissive = 'transmissive' in mesh.options && mesh.options.transmissive

    // first get correct render pass enty and stack
    const renderPassEntry = mesh.options.useCustomScenePassEntry
      ? mesh.options.useCustomScenePassEntry
      : isTransmissive || (hasRendererTransmissionPassEntry && isTransparent)
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

    const isTransparent = !!mesh.transparent
    const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected

    // const renderPassEntry = mesh.options.useCustomScenePassEntry
    //   ? mesh.options.useCustomScenePassEntry
    //   : ('transmissive' in mesh.options && mesh.options.transmissive) || mesh.transparent
    //   ? (this.renderer as GPUCameraRenderer).transmissionTarget.passEntry
    //   : this.getRenderTargetPassEntry(mesh.outputTarget)

    // rebuild stack
    const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque

    similarMeshes.push(mesh)

    this.orderStack(similarMeshes)
  }

  /**
   * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
   * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}.
   * @param mesh - Mesh to add.
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
    const similarObjects = renderBundle.transparent ? projectionStack.transparent : projectionStack.opaque

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

    // first get correct render pass entry and stack
    const renderPassEntry = [...this.renderPassEntries.renderTarget, ...this.renderPassEntries.postRenderTarget].find(
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
    if (!shaderPass.renderTexture) return

    const onAfterRenderPass = shaderPass.options.copyOutputToRenderTexture
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

    // const outputPass = shaderPass.outputTarget ? shaderPass.outputTarget.renderPass : this.renderer.postProcessingPass

    const label = shaderPass.options.isPrePass
      ? shaderPass.options.label + ' scene pre pass'
      : shaderPass.options.label + ' scene post processing pass'

    const shaderPassEntry = {
      label,
      // use output target or postprocessing render pass
      renderPass: outputPass,
      // render to output target renderTexture or directly to screen
      renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
      onBeforeRenderPass: null,
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

    this.patchPostProScreenShaderPasses()
    this.patchPreScreenShaderPasses()
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

    this.patchPostProScreenShaderPasses()
    this.patchPreScreenShaderPasses()
  }

  /**
   * Get all pre pocessing pass entries that are actually rendered to the screen.
   * @readonly
   * @returns - All pre pocessing pass entries actually rendered to the screen if any.
   */
  get activePreScreenShaderPassEntries() {
    return this.renderPassEntries.prePass.filter(
      (entry) => entry.element && !entry.element.outputTarget && entry.element.visible
    )
  }

  /**
   * Get all post pocessing pass entries that are actually rendered to the screen.
   * @readonly
   * @returns - All post pocessing pass entries actually rendered to the screen if any.
   */
  get activePostProScreenShaderPassEntries() {
    return this.renderPassEntries.postProPass.filter(
      (entry) => entry.element && !entry.element.outputTarget && entry.element.visible
    )
  }

  /**
   * Patch all pre processing pass entries render textures to allow chaining.
   */
  patchPreScreenShaderPasses() {
    this.activePreScreenShaderPassEntries.forEach((prePass, index) => {
      if (index === this.activePreScreenShaderPassEntries.length - 1) {
        if (this.activePostProScreenShaderPassEntries.length) {
          // if there's any active screen post pro pass, render to its first texture and load color
          prePass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null
          // prePass.renderPass = this.renderer.renderPass
          prePass.element.setRenderingOptionsForRenderPass(this.renderer.renderPass)
        } else {
          prePass.renderTexture = null
          prePass.renderPass = this.renderer.linearPass ?? this.renderer.renderPass
          prePass.element.setRenderingOptionsForRenderPass(this.renderer.linearPass ?? this.renderer.renderPass)
        }
      } else {
        prePass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null
        // prePass.renderPass = this.renderer.renderPass
        prePass.element.setRenderingOptionsForRenderPass(this.renderer.renderPass)
      }
    })
  }

  /**
   * Patch all post processing pass entries render textures to allow chaining.
   */
  patchPostProScreenShaderPasses() {
    this.activePostProScreenShaderPassEntries.forEach((postProPass, index) => {
      if (index < this.activePostProScreenShaderPassEntries.length - 1) {
        const nextEntry = this.activePostProScreenShaderPassEntries[index + 1]

        if (postProPass.element.inputTarget && nextEntry.element.inputTarget) {
          postProPass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null
        } else {
          postProPass.renderTexture = nextEntry.element.renderTexture
        }
      }

      if (this.renderer.linearPass) {
        if (index === this.activePostProScreenShaderPassEntries.length - 1) {
          postProPass.renderPass = this.renderer.linearPass
          postProPass.element.setRenderingOptionsForRenderPass(this.renderer.linearPass)
        } else {
          postProPass.renderPass = this.renderer.postProcessingPass
          postProPass.element.setRenderingOptionsForRenderPass(this.renderer.postProcessingPass)
        }
      }
    })

    // if any active post processing pass
    // render screen meshes into the first post processing pass texture
    if (this.activePostProScreenShaderPassEntries.length) {
      this.renderPassEntries.screen.forEach(
        (passEntry) => (passEntry.renderTexture = this.activePostProScreenShaderPassEntries[0]?.element?.renderTexture)
      )
    } else {
      this.renderPassEntries.screen.forEach((passEntry) => (passEntry.renderTexture = null))
    }
  }

  /**
   * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
   * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass.
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}.
   * @param pingPongPlane - {@link PingPongPlane} to add.
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
   * @returns - The {@link RenderPassEntry} if found.
   */
  getObjectRenderPassEntry(object: RenderedMesh | RenderTarget): RenderPassEntry | undefined {
    if (object.type === 'RenderTarget') {
      const targetPassEntries = (object as RenderTarget).options.isPostTarget
        ? this.renderPassEntries.postRenderTarget
        : this.renderPassEntries.renderTarget

      return targetPassEntries.find((entry) => entry.renderPass.uuid === (object as RenderTarget).renderPass.uuid)
    } else if (object.type === 'PingPongPlane') {
      return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid)
    } else if (object.type === 'ShaderPass') {
      if ((object as ShaderPass).options.isPrePass) {
        return this.renderPassEntries.prePass.find((entry) => entry.element?.uuid === object.uuid)
      } else {
        return this.renderPassEntries.postProPass.find((entry) => entry.element?.uuid === object.uuid)
      }
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
   * @param meshes - Transparent projected meshes array to sort.
   */
  sortTransparentMeshes(meshes: ProjectedMesh[]) {
    meshes.sort((meshA, meshB) => {
      if (meshA.renderOrder !== meshB.renderOrder) {
        return meshA.renderOrder - meshB.renderOrder
      }

      if (this.isStackObjectRenderBundle(meshA) || this.isStackObjectRenderBundle(meshB)) {
        return meshA.renderOrder - meshB.renderOrder
      }

      // apply world matrices to objects
      if (meshA.geometry) {
        posA.copy(meshA.geometry.boundingBox.center).applyMat4(meshA.worldMatrix)
      } else {
        meshA.worldMatrix.getTranslation(posA)
      }

      if (meshB.geometry) {
        posB.copy(meshB.geometry.boundingBox.center).applyMat4(meshB.worldMatrix)
      } else {
        meshB.worldMatrix.getTranslation(posB)
      }

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

  // TODO just an idea, but does not work very well for now.
  // see https://github.com/KhronosGroup/glTF-Sample-Viewer/commit/f4cd6b11de9787db0cd35c06dfa46be7b5440aab
  /**
   * Sort transparent and transmissive meshes and eventually swap transparent meshes stack so they are drawn before or after transmissive meshes based on their distance to camera.
   */
  // sortTransparentTransmissiveMeshes() {
  //   if (
  //     'transmissionTarget' in this.renderer &&
  //     this.renderer.transmissionTarget &&
  //     this.renderer.transmissionTarget.passEntry
  //   ) {
  //     const mainPassEntry = this.getRenderTargetPassEntry()
  //     const transmissiveEntry = this.renderer.transmissionTarget.passEntry

  //     if (!transmissiveEntry.stack.projected.opaque.length) return

  //     // get all transparent meshes, only if they're not in a render bundle
  //     const transparentMeshes = [
  //       ...mainPassEntry.stack.projected.transparent,
  //       ...transmissiveEntry.stack.projected.transparent,
  //     ]
  //       .map((obj) => (obj instanceof Mesh ? obj : null))
  //       .filter(Boolean)

  //     // get all transmissive meshes, render bundle or not
  //     const transmissiveMeshes = transmissiveEntry.stack.projected.opaque
  //       .map((obj) => {
  //         return obj instanceof RenderBundle ? Array.from(obj.meshes).map(([k, m]) => m) : obj
  //       })
  //       .flat()

  //     // bail if no transparent or transmissive meshes
  //     if (!transparentMeshes.length || !transmissiveMeshes.length) return

  //     const meshesToSort = [...transparentMeshes, ...transmissiveMeshes] as ProjectedMesh[]

  //     // if only one mesh, no need to sort
  //     if (meshesToSort.length <= 1) return

  //     // sort
  //     this.sortTransparentMeshes(meshesToSort)

  //     // find first transmissive index mesh
  //     const firstTransmissiveIndex = meshesToSort.findIndex(
  //       (m) => 'transmissive' in m.options && m.options.transmissive
  //     )

  //     mainPassEntry.stack.projected.transparent = []
  //     transmissiveEntry.stack.projected.transparent = []

  //     for (let i = 0; i < firstTransmissiveIndex; i++) {
  //       mainPassEntry.stack.projected.transparent.push(meshesToSort[i])
  //     }

  //     for (let i = firstTransmissiveIndex + 1; i < meshesToSort.length; i++) {
  //       if (meshesToSort[i].transparent) transmissiveEntry.stack.projected.transparent.push(meshesToSort[i])
  //     }
  //   }
  // }
  //

  getTextureId(renderPassEntry: RenderPassEntry): string {
    const texture = renderPassEntry.renderTexture?.options?.fromTexture ?? renderPassEntry.renderTexture ?? null
    return texture?.uuid ?? 'context'
  }

  endCurrentRenderPass() {
    if (this.#currentRenderPass) {
      this.#currentRenderPass.end()
      this.#currentRenderPass = null
    }
  }

  /**
   * Here we render a {@link RenderPassEntry}:
   * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture.
   * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified.
   * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}.
   * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes.
   * - End the {@link GPURenderPassEncoder | GPU render pass encoder}.
   * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified.
   * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}.
   * @param commandEncoder - Current {@link GPUCommandEncoder}.
   * @param renderPassEntry - {@link RenderPassEntry} to render.
   */
  renderPassesEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry, forceEnd = false) {
    const textureId = this.getTextureId(renderPassEntry)

    const isDifferentTexturePresentation = textureId !== this.#previousTextureId
    const hasBeforeAfterCommands = !!renderPassEntry.onBeforeRenderPass || !!renderPassEntry.onAfterRenderPass

    // set the pass texture to render to
    const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture)

    if (renderPassEntry.onBeforeRenderPass) {
      renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture)
    }

    if (renderPassEntry.useCustomRenderPass) {
      renderPassEntry.useCustomRenderPass(commandEncoder)
    } else {
      // now begin our actual render pass
      const startNewPass = !this.#currentRenderPass || isDifferentTexturePresentation

      const hasEndedPass = this.#currentRenderPass && startNewPass
      if (startNewPass) {
        this.endCurrentRenderPass()

        this.#currentRenderPass = renderPassEntry.renderPass.beginRenderPass(commandEncoder)
      }

      this.renderSinglePassEntry(this.#currentRenderPass, renderPassEntry)

      this.#previousTextureId = hasEndedPass ? null : textureId

      const shouldEndPass =
        forceEnd || !this.#nextTextureId || (this.#currentRenderPass && this.#previousTextureId !== this.#nextTextureId)

      if (shouldEndPass) {
        this.endCurrentRenderPass()
      }
    }

    if (renderPassEntry.onAfterRenderPass) {
      renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture)
    }

    this.renderer.pipelineManager.resetCurrentPipeline()

    // if we've written to the main buffer depth,
    // we'll need to load its depth next time
    // if (
    //   renderPassEntry.renderPass.options.useDepth &&
    //   renderPassEntry.renderPass.options.renderToSwapChain &&
    //   !renderPassEntry.renderPass.options.depthReadOnly &&
    //   renderPassEntry.renderPass.options.depthStoreOp === 'store' &&
    //   renderPassEntry.renderPass.depthTexture.uuid === this.renderer.renderPass.depthTexture?.uuid
    // ) {
    //   this.#shouldLoadDepth = true
    // }
  }

  /**
   * Here we render a {@link RenderPassEntry}:
   * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture.
   * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified.
   * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}.
   * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes.
   * - End the {@link GPURenderPassEncoder | GPU render pass encoder}.
   * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified.
   * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}.
   * @param commandEncoder - Current {@link GPUCommandEncoder}.
   * @param renderPassEntry - {@link RenderPassEntry} to render.
   */
  renderSinglePassEntry(pass: GPURenderPassEncoder, renderPassEntry: RenderPassEntry): GPURenderPassEncoder {
    if (!this.renderer.production) {
      pass.pushDebugGroup(
        renderPassEntry.element
          ? `${renderPassEntry.element.options.label} render pass on ${renderPassEntry.label} using ${renderPassEntry.renderPass.options.label} descriptor`
          : `Render stack pass on ${renderPassEntry.label} using ${renderPassEntry.renderPass.options.label}${
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
        this.sortTransparentMeshes(
          renderPassEntry.stack.projected.transparent.filter((o) => o instanceof Mesh) as ProjectedMesh[]
        )

        for (const mesh of renderPassEntry.stack.projected.transparent) {
          mesh.render(pass)
        }
      }
    }

    if (!this.renderer.production) pass.popDebugGroup()

    return pass
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
   * Render our {@link Scene}.
   * - Execute {@link onBeforeRender} first.
   * - Then render {@link computePassEntries}.
   * - And finally render our {@link renderPassEntries}.
   * @param commandEncoder - Current {@link GPUCommandEncoder}.
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

    // reset load/store flags
    this.#shouldLoadColors = false
    this.#shouldLoadDepth = false
    this.#shouldStoreColors = false
    this.#shouldStoreDepth = false

    this.#currentRenderPass = null
    this.#previousTextureId = null
    this.#nextTextureId = null
    this.#texturesIds = new Set()
    this.#depthTexturesIds = new Set()

    // get the number of screen post processing passes
    const screenPrePassCount = this.activePreScreenShaderPassEntries?.length
    const screenPostProPassCount = this.activePostProScreenShaderPassEntries?.length

    const mergedPasses = Object.keys(this.renderPassEntries).reduce((acc, renderPassEntryType) => {
      acc.push({
        renderPassEntryType,
        renderPassEntries: this.renderPassEntries[renderPassEntryType],
      })

      return acc
    }, [])

    // store frame textures ids
    this.#renderingState.frameTexturesIds = []
    this.#renderingState.frameDepthTexturesIds = []
    mergedPasses.forEach(({ renderPassEntryType, renderPassEntries }) => {
      const renderablePassEntries = renderPassEntries.filter(
        (renderPassEntry: RenderPassEntry) => !!this.getRenderPassEntryLength(renderPassEntry)
      )

      renderablePassEntries.forEach((renderPassEntry: RenderPassEntry, index: number) => {
        const textureId = this.getTextureId(renderPassEntry)
        this.#renderingState.frameTexturesIds.push(textureId)

        const depthTextureId = renderPassEntry.renderPass.depthTexture?.uuid ?? null
        this.#renderingState.frameDepthTexturesIds.push(depthTextureId)
      })
    })

    let globalIndex = 0
    mergedPasses.forEach(({ renderPassEntryType, renderPassEntries }, mergedPassIndex: number) => {
      // force clearing the renderPass depth buffer before drawing any post processing pass
      // reset it even if there's no post processing pass
      if (renderPassEntryType === 'postProPass') {
        this.renderer.renderPass.setDepthReadOnly(false)
        this.renderer.renderPass.setDepthLoadOp('clear')
      }

      const renderablePassEntries = renderPassEntries.filter(
        (renderPassEntry: RenderPassEntry) => !!this.getRenderPassEntryLength(renderPassEntry)
      )

      renderablePassEntries.forEach((renderPassEntry: RenderPassEntry, index: number) => {
        // LOAD OP

        const textureId = this.getTextureId(renderPassEntry)

        const nextRenderablePass = () => {
          if (mergedPassIndex === mergedPasses.length - 1) {
            return null
          }

          let nextRenderablePass: RenderPassEntry | null = null
          for (let i = mergedPassIndex + 1; i < mergedPasses.length; i++) {
            const nextPass = mergedPasses[i]
            for (let j = 0; j < nextPass.renderPassEntries.length; j++) {
              if (this.getRenderPassEntryLength(nextPass.renderPassEntries[j])) {
                nextRenderablePass = nextPass.renderPassEntries[j]
                break
              }
            }

            if (nextRenderablePass) {
              break
            }
          }

          return nextRenderablePass
        }

        // next texture ID
        const nextPassEntry =
          index < renderablePassEntries.length - 1 ? renderablePassEntries[index + 1] : nextRenderablePass() ?? null

        this.#nextTextureId = nextPassEntry ? this.getTextureId(nextPassEntry) : null

        // load flags

        // if it's a post pro pass with a custom output target, clear
        //         if (renderPassEntryType === 'postProPass') {
        //           // if (renderPassEntry.renderPass.uuid !== this.renderer.postProcessingPass.uuid) {
        //           //   this.#shouldLoadColors = false
        //           // }
        //           //
        //
        //           if (this.#previousTextureId === 'context') {
        //             this.#shouldLoadColors = true
        //           } else {
        //             this.#shouldLoadColors = false
        //           }
        //
        //           // this.#shouldLoadColors = false
        //         }
        //
        //         if (renderPassEntryType === 'prePass') {
        //           this.#shouldLoadColors = index > 0
        //         } else if (renderPassEntryType === 'screen') {
        //           // load pre passes already rendered to that texture
        //           this.#shouldLoadColors = index > 0 || !!screenPrePassCount
        //         }

        // TEST
        // if (textureId === this.#previousTextureId) {
        //   this.#shouldLoadColors = true
        // }

        const loadPrePassOntoScreen = renderPassEntryType === 'screen' && !!screenPrePassCount

        if (this.#texturesIds.has(textureId) || loadPrePassOntoScreen) {
          this.#shouldLoadColors = true
        } else {
          this.#shouldLoadColors = false
          this.#texturesIds.add(textureId)
        }

        const depthTextureId = renderPassEntry.renderPass.depthTexture?.uuid ?? null
        if (depthTextureId) {
          if (this.#depthTexturesIds.has(depthTextureId)) {
            this.#shouldLoadDepth = true
          } else {
            this.#depthTexturesIds.add(depthTextureId)
            this.#shouldLoadDepth = false
          }
        } else {
          this.#shouldLoadDepth = false
        }

        // if it's a post target pass, clear all
        if (renderPassEntryType === 'postRenderTarget') {
          this.#shouldLoadDepth = false
        }

        // disable depth write if it's a shader pass, else enable
        if (renderPassEntryType === 'prePass' || renderPassEntryType === 'postProPass') {
          renderPassEntry.renderPass.setDepthReadOnly(true)
        } else {
          renderPassEntry.renderPass.setDepthReadOnly(false)
        }

        // load operations
        renderPassEntry.renderPass.setLoadOp(this.#shouldLoadColors ? 'load' : 'clear')
        renderPassEntry.renderPass.setDepthLoadOp(this.#shouldLoadDepth ? 'load' : 'clear')

        // STORE OP

        // do not store when writing to a render target or screen
        //         const screenDiscard =
        //           renderPassEntryType === 'screen' &&
        //           this.activePostProScreenShaderPassEntries.length > 1 &&
        //           renderPassEntry.renderTexture?.uuid ===
        //             this.activePostProScreenShaderPassEntries[0].element.renderTexture?.uuid
        //         // const screenDiscard = false
        //
        //         // store flags
        //         if (!renderPassEntry.renderTexture) {
        //           this.#shouldStoreColors = true
        //         } else if (screenDiscard) {
        //           this.#shouldStoreColors = false
        //         } else if (renderPassEntryType !== 'renderTarget' && renderPassEntryType !== 'postRenderTarget') {
        //           this.#shouldStoreColors = true
        //         } else {
        //           this.#shouldStoreColors = false
        //         }
        //
        //         if (renderPassEntryType === 'prePass') {
        //           this.#shouldStoreColors = true
        //         }

        // render to canvas? store color
        this.#shouldStoreColors = !renderPassEntry.renderTexture

        // pre/post pro pass are chained, so store colors
        if (renderPassEntryType === 'postProPass' || renderPassEntryType === 'prePass') {
          this.#shouldStoreColors = true
        }

        if (globalIndex === this.#renderingState.frameTexturesIds.length - 1) {
          // last pass? store colors to display frame
          this.#shouldStoreColors = true
        } else {
          for (let i = globalIndex + 1; i < this.#renderingState.frameTexturesIds.length; i++) {
            // we will render to this specific texture later? store
            if (textureId === this.#renderingState.frameTexturesIds[i]) {
              this.#shouldStoreColors = true
              break
            }
          }
        }

        // if (shouldStoreColors !== this.#shouldStoreColors) {
        //   console.log(
        //     globalIndex,
        //     renderPassEntryType,
        //     index,
        //     renderPassEntry.label,
        //     this.#shouldStoreColors,
        //     this.#previousTextureId,
        //     textureId,
        //     this.#nextTextureId,
        //     this.#renderingState.frameTexturesIds
        //   )
        // }

        // console.log(
        //   globalIndex,
        //   renderPassEntry.label,
        //   this.#shouldStoreColors,
        //   textureId,
        //   this.#renderingState.frameTexturesIds
        // )

        // TEST
        // if (textureId === this.#nextTextureId) {
        //   this.#shouldStoreColors = true
        // }

        // console.log({
        //   renderPassLabel: renderPassEntry.label,
        //   previousID: this.#previousTextureId,
        //   currentID: textureId,
        //   nextID: this.#nextTextureId,
        //   loadColors: this.#shouldLoadColors,
        //   storeColors: this.#shouldStoreColors,
        // })

        // store screen depth only if we have multiple screen pass entries, and not the last one
        // const storeScreenDepth =
        //   renderPassEntryType === 'screen' &&
        //   this.renderPassEntries.screen.length > 1 &&
        //   index < this.renderPassEntries.screen.length - 1
        //

        //         let shouldStoreDepth = false
        //         const storeScreenDepth = screenPostProPassCount > 1
        //
        //         const storeDepth =
        //           renderPassEntry.renderPass.options.useDepth &&
        //           (renderPassEntryType === 'renderTarget' || renderPassEntryType === 'postRenderTarget' || storeScreenDepth)
        //
        //         shouldStoreDepth = storeDepth

        this.#shouldStoreDepth = false
        if (depthTextureId && globalIndex < this.#renderingState.frameTexturesIds.length - 1) {
          for (let i = globalIndex + 1; i < this.#renderingState.frameDepthTexturesIds.length; i++) {
            if (depthTextureId === this.#renderingState.frameDepthTexturesIds[i]) {
              this.#shouldStoreDepth = true
              break
            }
          }
        }

        // store operattions
        renderPassEntry.renderPass.setStoreOp(this.#shouldStoreColors ? 'store' : 'discard')
        renderPassEntry.renderPass.setDepthStoreOp(this.#shouldStoreDepth ? 'store' : 'discard')

        this.renderPassesEntry(commandEncoder, renderPassEntry, index === renderablePassEntries.length - 1)

        globalIndex++
      })
    })
  }
}
