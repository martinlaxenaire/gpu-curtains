import { isRenderer, Renderer } from '../renderers/utils'
import { ProjectedMesh, RenderedMesh, SceneStackedMesh } from '../renderers/GPURenderer'
import { generateUUID, throwWarning } from '../../utils/utils'
import { BufferBinding } from '../bindings/BufferBinding'
import { BufferUsageKeys } from '../buffers/utils'
import { RenderPass } from './RenderPass'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { IndirectBuffer } from '../../extras/buffers/IndirectBuffer'
import { MediaTexture } from '../textures/MediaTexture'

let bundleIndex = 0

/** Options used to create a {@link RenderBundle}. */
export interface RenderBundleOptions {
  /** The label of the {@link RenderBundle}, sent to various GPU objects for debugging purpose. */
  label: string
  /** The {@link RenderPass} used to describe the {@link RenderBundle#descriptor | RenderBundle encoder descriptor}. Default to the first added mesh output target if not set (usually the {@link Renderer#renderPass | renderer main render pass} or {@link Renderer#postProcessingPass | renderer post processing pass}). */
  renderPass: RenderPass
  /** Whether the {@link RenderBundle} should handle all its child {@link core/renderers/GPURenderer.ProjectedMesh | meshes} transformation matrices with a single {@link GPUBuffer}. Can greatly improve performance when dealing with a lot of moving objects, but the {@link size} parameter has to be set upon creation and should not change afterwards. Default to `false`. */
  useBuffer: boolean
  /** Fixed size (number of meshes) of the {@link RenderBundle}. Mostly useful when using the {@link useBuffer} parameter. */
  size: number
  /** Whether this {@link RenderBundle} should create its own {@link IndirectBuffer} and add its {@link RenderBundle#meshes | meshes} geometries to it. Default to `false`. */
  useIndirectDraw: boolean
}

/** Parameters used to created a {@link RenderBundle}. */
export interface RenderBundleParams extends Partial<RenderBundleOptions> {
  /** Controls the order in which this {@link RenderBundle} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
  renderOrder?: number
  /** Whether this {@link RenderBundle} should be added to our {@link core/scenes/Scene.Scene | Scene} transparent stack (drawn after the opaque stack). */
  transparent?: boolean
  /** Whether this {@link RenderBundle} content should be drawn. */
  visible?: boolean
}

/**
 * Used to create a {@link GPURenderBundle} and its associated {@link GPURenderBundleEncoder}.
 *
 * Render bundle are a powerful tool that can significantly reduce the amount of CPU time spent issuing repeated rendered commands. In other words, it can be used to draw given set of meshes that share the same {@link RenderPass | output target} faster (up to 1.5x in some cases) and with less CPU overhead.
 *
 * The main drawback is that {@link RenderBundle} works best when the number of meshes drawn is known in advance and is not subject to change.
 *
 * @example
 * ```javascript
 * const nbMeshes = 100
 *
 * // assuming 'renderer' is a valid renderer or curtains instance
 * const renderBundle = new RenderBundle(renderer, {
 *   label: 'Custom render bundle',
 *   size: nbMeshes,
 *   useBuffer: true, // use a single buffer to handle all 100 meshes transformations
 * })
 *
 * for (let i = 0; i < nbMeshes; i++) {
 *   const mesh = new Mesh(renderer, {
 *     label: 'Cube ' + i,
 *     geometry: new BoxGeometry(),
 *     renderBundle,
 *   })
 *
 *   mesh.onBeforeRender(() => {
 *     mesh.rotation.y += 0.02
 *   })
 * }
 * ```
 */
export class RenderBundle {
  /** The type of the {@link RenderBundle}. */
  type: string
  /** The universal unique id of this {@link RenderBundle}. */
  readonly uuid: string
  /** Index of this {@link RenderBundle}, i.e. creation order. */
  readonly index: number

  /** The {@link Renderer} used to create this {@link RenderBundle}. */
  renderer: Renderer

  /** Options used to create this {@link RenderBundle}. */
  options: RenderBundleOptions

  /** Controls the order in which this {@link RenderBundle} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
  renderOrder: number
  /** Whether this {@link RenderBundle} should be added to our {@link core/scenes/Scene.Scene | Scene} transparent stack (drawn after the opaque stack). */
  transparent: boolean | null
  /** Whether this {@link RenderBundle} content should be drawn. */
  visible: boolean

  /** @ignore */
  // whether this render bundle should be added to the 'projected' or 'unProjected' Scene stacks.
  #useProjection: boolean | null

  /** Optional {@link BufferBinding} created if the {@link RenderBundleParams#useBuffer | useBuffer} parameter has been set to `true` and if the {@link meshes} drawn actually have transformation matrices. This {@link BufferBinding} will act as a parent buffer, and the {@link meshes} `matrices` binding will use a {@link BufferBinding} with this {@link binding} as parent and the correct `offset`. */
  binding: BufferBinding | null

  /** Optional internal {@link IndirectBuffer} containing all {@link meshes} unique geometries to render them using indirect drawing. */
  indirectBuffer: IndirectBuffer | null

  /** The {@link GPUDevice.createRenderBundleEncoder().descriptor | GPURenderBundleEncoderDescriptor} created by this {@link RenderBundle}, based on the {@link RenderPass} passed as parameters. */
  descriptor: GPURenderBundleEncoderDescriptor
  /** The {@link GPURenderBundleEncoder} created by this {@link RenderBundle}. */
  encoder: GPURenderBundleEncoder | null
  /** The {@link GPURenderBundle} created by this {@link RenderBundle}. */
  bundle: GPURenderBundle | null

  /** A {@link Map} of {@link RenderedMesh | mesh} drawn by this {@link RenderBundle}. */
  meshes: Map<RenderedMesh['uuid'], RenderedMesh>

  /** @ignore */
  #ready: boolean

  /**
   * RenderBundle constructor
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link RenderBundle}.
   * @param parameters - {@link RenderBundleParams | parameters} use to create this {@link RenderBundle}.
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    {
      label,
      renderPass = null,
      renderOrder = 0,
      transparent = null,
      visible = true,
      size = 0,
      useBuffer = false,
      useIndirectDraw = false,
    } = {} as RenderBundleParams
  ) {
    this.type = 'RenderBundle'

    renderer = isRenderer(renderer, this.type)

    this.uuid = generateUUID()

    Object.defineProperty(this as RenderBundle, 'index', { value: bundleIndex++ })
    this.renderOrder = renderOrder

    this.transparent = transparent
    this.visible = visible

    label = label ?? this.type + this.index

    this.options = {
      label,
      renderPass,
      useBuffer,
      size,
      useIndirectDraw,
    }

    this.meshes = new Map()

    this.encoder = null
    this.bundle = null
    this.#ready = false

    this.binding = null
    this.indirectBuffer = null

    this.setRenderer(renderer)

    if (this.options.useIndirectDraw) {
      this.indirectBuffer = new IndirectBuffer(this.renderer)
    }

    if (this.options.useBuffer) {
      this.#useProjection = true

      if (this.options.size !== 0) {
        this.#setBinding()
      } else {
        this.options.useBuffer = false

        if (!this.renderer.production) {
          throwWarning(
            `${this.options.label} (${this.type}): Cannot use a single transformation buffer if the size parameter has not been set upon creation.`
          )
        }
      }
    }
  }

  /**
   * Set the {@link RenderBundle} {@link RenderBundle.renderer | renderer} and eventually remove/add to the {@link core/scenes/Scene.Scene | Scene}.
   * @param renderer - new {@link Renderer} to use.
   */
  setRenderer(renderer: Renderer) {
    if (this.renderer) {
      this.removeFromScene()
      this.renderer.renderBundles.delete(this.uuid)
    }

    this.renderer = renderer
    this.renderer.renderBundles.set(this.uuid, this)

    if (this.meshes.size >= 1) {
      this.addToScene()
    }
  }

  /**
   * Add our {@link RenderBundle} to the {@link core/scenes/Scene.Scene | Scene}.
   * Once we have at least one mesh in our {@link meshes} Map, we can add the {@link RenderBundle} to the {@link core/scenes/Scene.Scene | Scene} at the right place.
   */
  addToScene() {
    const firstEntry = this.meshes.entries().next()

    if (firstEntry && firstEntry.value && firstEntry.value.length && firstEntry.value[1]) {
      const mesh = firstEntry.value[1]

      // first mesh of the render bundle?
      const isTransparent = !!mesh.transparent

      if (this.transparent === null) {
        this.transparent = isTransparent
      }

      if (mesh.type !== 'ShaderPass' && mesh.type !== 'PingPongPlane') {
        const { useProjection } = mesh.material.options.rendering

        if (this.useProjection === null) {
          this.useProjection = useProjection
        }

        // add the render bundle to the correct stack
        const projectionStack = this.renderer.scene.getMeshProjectionStack(mesh)
        this.renderer.scene.addRenderBundle(this, projectionStack)
      } else {
        // force render bundle size to 1
        this.size = 1
        mesh.renderOrder = this.renderOrder
        this.useProjection = false
      }
    }
  }

  /**
   * Remove our {@link RenderBundle} from the {@link core/scenes/Scene.Scene | Scene}.
   */
  removeFromScene() {
    this.renderer.scene.removeRenderBundle(this)
  }

  /**
   * Get whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not (useful to know in which {@link core/scenes/Scene.Scene | Scene} stack it has been added.
   * @readonly
   * @returns - Whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
   */
  get useProjection(): boolean | null {
    return this.#useProjection
  }

  /**
   * Set whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
   * @param value - New projection value.
   */
  set useProjection(value: boolean) {
    this.#useProjection = value
  }

  /**
   * Set the {@link binding} and patches its array and buffer size if needed.
   * @private
   */
  #setBinding() {
    this.binding = new BufferBinding({
      label: this.options.label + ' matrices',
      name: 'matrices',
      visibility: ['vertex', 'fragment'],
      struct: {
        model: {
          type: 'array<mat4x4f>',
          value: new Float32Array(16 * this.options.size),
        },
        modelView: {
          type: 'array<mat4x4f>',
          value: new Float32Array(16 * this.options.size),
        },
        normal: {
          type: 'array<mat3x3f>',
          value: new Float32Array(12 * this.options.size),
        },
      },
    })

    this.#patchBindingOffset(this.options.size)
  }

  /**
   * Path the {@link binding} array and buffer size with the minimum {@link core/renderers/GPURenderer.GPURenderer#device | device} buffer offset alignment.
   * @param size - new {@link binding} size to use.
   * @private
   */
  #patchBindingOffset(size: number) {
    const minOffset = this.renderer.device?.limits.minUniformBufferOffsetAlignment || 256

    // patch minimum uniform buffer offset
    if (this.binding.arrayBufferSize < size * minOffset) {
      this.binding.arrayBufferSize = size * minOffset
      this.binding.arrayBuffer = new ArrayBuffer(this.binding.arrayBufferSize)
      this.binding.arrayView = new DataView(this.binding.arrayBuffer, 0, this.binding.arrayBufferSize)
      this.binding.buffer.size = this.binding.arrayBuffer.byteLength
    }
  }

  /**
   * Called each time the {@link RenderBundle} size has actually changed.
   * @param newSize - new {@link RenderBundle} size to set.
   * @private
   */
  #onSizeChanged(newSize: number) {
    if (newSize > this.options.size && this.binding) {
      this.#patchBindingOffset(newSize)

      // now re add all the meshes matrices bindings to the new array buffer
      let offset = 0
      this.meshes.forEach((mesh: ProjectedMesh) => {
        mesh.patchRenderBundleBinding(offset)

        offset++
      })

      if (this.binding.buffer.GPUBuffer) {
        this.binding.buffer.GPUBuffer.destroy()

        this.binding.buffer.createBuffer(this.renderer, {
          label: this.binding.options.label,
          usage: [
            ...(['copySrc', 'copyDst', this.binding.bindingType] as BufferUsageKeys[]),
            ...this.binding.options.usage,
          ],
        })

        this.binding.shouldUpdate = true
      }
    }
  }

  /**
   * Set the new {@link RenderBundle} size. Should be used before adding or removing {@link meshes} to the {@link RenderBundle} if the {@link bundle} has already been created (especially if it's using a {@link binding}).
   * @param value - New size to set.
   */
  set size(value: number) {
    if (value !== this.options.size) {
      if (this.ready && !this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not change its size after it has been created.`
        )
      }

      this.ready = false

      this.#onSizeChanged(value)

      this.options.size = value
    }
  }

  /**
   * Get whether our {@link RenderBundle} is ready.
   * @readonly
   * @returns - Whether our {@link RenderBundle} is ready.
   */
  get ready(): boolean {
    return this.renderer.ready && this.#ready
  }

  /**
   * Set whether our {@link RenderBundle} is ready and encode it if needed.
   * @param value - New ready state.
   */
  set ready(value: boolean) {
    if (value && !this.ready) {
      const init = () => {
        // set the new size
        // can eventually resize the buffer
        this.size = this.meshes.size

        if (this.options.useIndirectDraw) {
          this.meshes.forEach((mesh) => {
            this.indirectBuffer.addGeometry(mesh.geometry)
          })

          this.indirectBuffer.create()
        }

        // finally ready
        this.#encodeRenderCommands()
        this.#ready = value
      }

      if (this.renderer.device) {
        init()
      } else {
        const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
          () => {
            if (this.renderer.device) {
              this.renderer.onBeforeCommandEncoderCreation.remove(taskId)
              init()
            }
          },
          { once: false }
        )
      }
    } else if (!value && this.ready) {
      // invalidate
      this.bundle = null
      this.#ready = value
    }
  }

  /**
   * Called by the {@link core/scenes/Scene.Scene | Scene} to eventually add a {@link RenderedMesh | mesh} to this {@link RenderBundle}. Can set the {@link RenderBundleOptions#renderPass | render pass} if needed. If the {@link RenderBundleOptions#renderPass | render pass} is already set and the mesh output {@link RenderPass} does not match, it won't be added.
   * @param mesh - {@link RenderedMesh | Mesh} to eventually add.
   * @param outputPass - The mesh output {@link RenderPass}.
   */
  addMesh(mesh: RenderedMesh, outputPass: RenderPass) {
    // check for correct render pass first?
    if (!this.options.renderPass) {
      this.options.renderPass = outputPass
    } else if (outputPass.uuid !== this.options.renderPass.uuid) {
      if (!this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because the output render passes do not match.`
        )
      }

      mesh.renderBundle = null

      return
    }

    if (mesh.options.stencil) {
      if (!this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because stencil operations are not supported by render bundles.`
        )
      }

      mesh.renderBundle = null

      return
    }

    if (this.ready && !this.renderer.production) {
      throwWarning(
        `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not add meshes to it after it has been created (mesh added: ${mesh.options.label}).`
      )
    }

    this.ready = false
    this.meshes.set(mesh.uuid, mesh)

    if (this.meshes.size === 1) {
      this.addToScene()
    }
  }

  /**
   * Remove any {@link RenderedMesh | rendered mesh} from this {@link RenderBundle}.
   * @param mesh - {@link RenderedMesh | Mesh} to remove.
   */
  removeSceneObject(mesh: RenderedMesh) {
    if (this.ready && !this.renderer.production) {
      throwWarning(
        `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not remove meshes from it after it has been created (mesh removed: ${mesh.options.label}).`
      )
    }

    this.ready = false
    this.meshes.delete(mesh.uuid)

    mesh.setRenderBundle(null, false)

    if (this.options.useIndirectDraw) {
      mesh.geometry.indirectDraw = null
    }
  }

  /**
   * Remove a {@link SceneStackedMesh | scene stacked mesh} from this {@link RenderBundle}.
   * @param mesh - {@link SceneStackedMesh | Scene stacked mesh} to remove.
   * @param keepMesh - Whether to preserve the mesh in order to render it normally again. Default to `true`.
   */
  removeMesh(mesh: SceneStackedMesh, keepMesh = true) {
    this.removeSceneObject(mesh)

    if (keepMesh && mesh.type !== 'ShaderPass' && mesh.type !== 'PingPongPlane') {
      this.renderer.scene.addMesh(mesh)
    }

    if (this.meshes.size === 0) {
      this.renderer.scene.removeRenderBundle(this)
    }
  }

  /**
   * Set the {@link descriptor} based on the {@link RenderBundleOptions#renderPass | render pass}.
   * @private
   */
  #setDescriptor() {
    this.descriptor = {
      ...(this.options.renderPass.options.colorAttachments && {
        colorFormats: this.options.renderPass.options.colorAttachments.map(
          (colorAttachment) => colorAttachment.targetFormat
        ),
      }),
      ...(this.options.renderPass.options.useDepth && {
        depthStencilFormat: this.options.renderPass.options.depthFormat,
      }),
      sampleCount: this.options.renderPass.options.sampleCount,
    }
  }

  /**
   * Create the {@link descriptor}, {@link encoder} and {@link bundle} used by this {@link RenderBundle}.
   * @private
   */
  #encodeRenderCommands() {
    this.#setDescriptor()

    this.renderer.pipelineManager.resetCurrentPipeline()

    this.encoder = this.renderer.device.createRenderBundleEncoder({
      ...this.descriptor,
      label: this.options.label + ' (encoder)',
    })

    if (!this.renderer.production) {
      this.encoder.pushDebugGroup(`${this.options.label}: create encoder`)
    }

    // render commands
    let offset = 0
    this.meshes.forEach((mesh) => {
      mesh.material.render(this.encoder)
      mesh.geometry.render(this.encoder)

      offset++
    })

    if (!this.renderer.production) {
      this.encoder.popDebugGroup()
    }

    this.bundle = this.encoder.finish({ label: this.options.label + ' (bundle)' })

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Update the {@link binding} buffer if needed.
   */
  updateBinding() {
    if (this.binding && this.binding.shouldUpdate && this.binding.buffer.GPUBuffer) {
      this.renderer.queueWriteBuffer(this.binding.buffer.GPUBuffer, 0, this.binding.arrayBuffer)
      this.binding.shouldUpdate = false
    }
  }

  /**
   * If one of the {@link meshes} is using a {@link core/textures/Texture.Texture | Texture} dependent of the {@link renderer}, invalidate the {@link RenderBundle} in order to resize the {@link core/textures/Texture.Texture | Texture}.
   */
  resize() {
    for (const [_uuid, mesh] of this.meshes) {
      const hasRenderTexture = mesh.textures.find((texture) => !texture.options.fixedSize)
      if (hasRenderTexture) {
        this.ready = false
        break
      }
    }
  }

  /**
   * Render the {@link RenderBundle}.
   *
   * If it is ready, execute each {@link core/meshes/Mesh.Mesh.onBeforeRenderPass | mesh onBeforeRenderPass method}, {@link updateBinding | update the binding} if needed, execute the {@link bundle} and finally execute each {@link core/meshes/Mesh.Mesh.onAfterRenderPass | mesh onAfterRenderPass method}.
   *
   * If not, just render its {@link meshes} as usual and check whether they are all ready and if we can therefore encode our {@link RenderBundle}.
   * @param pass - {@link GPURenderPassEncoder} to use.
   */
  render(pass: GPURenderPassEncoder) {
    if (!this.renderer.ready) return

    // render bundle ready, render meshes
    if (this.ready && this.bundle && this.visible) {
      this.meshes.forEach((mesh) => {
        mesh.onBeforeRenderPass()
      })

      // update transformations binding if needed
      this.updateBinding()

      // force pipeline resets before and after executing the bundle
      this.renderer.pipelineManager.resetCurrentPipeline()

      if (!this.renderer.production) {
        pass.pushDebugGroup(`${this.options.label}: execute bundle`)
      }

      pass.executeBundles([this.bundle])

      if (!this.renderer.production) {
        pass.popDebugGroup()
      }

      this.renderer.pipelineManager.resetCurrentPipeline()

      this.meshes.forEach((mesh) => {
        mesh.onAfterRenderPass()
      })
    }

    // bundle not ready?
    // render meshes as usual
    let index = 0
    if (!this.ready) {
      let isReady = true

      for (const [_key, mesh] of this.meshes) {
        mesh.render(pass)

        if (!mesh.ready) {
          isReady = false
        }

        // media textures should be ready
        // in order to validate the render bundle
        for (const texture of mesh.textures) {
          if (texture instanceof MediaTexture && !texture.sourcesUploaded) {
            isReady = false
          }
        }

        index++
      }

      // update transformations binding if needed
      this.updateBinding()

      this.ready = isReady
    }
  }

  /**
   * Called when the {@link core/renderers/GPURenderer.GPURenderer#device | WebGPU device} has been lost.
   * Just set the {@link ready} flag to `false` to eventually invalidate the {@link bundle}.
   */
  loseContext() {
    this.ready = false
  }

  /**
   * Empty the {@link RenderBundle}. Can eventually re-add the {@link SceneStackedMesh | scene stacked meshes} to the {@link core/scenes/Scene.Scene | Scene} in order to render them normally again.
   * @param keepMeshes - Whether to preserve the {@link meshes} in order to render them normally again. Default to `true`.
   */
  empty(keepMeshes = true) {
    this.ready = false

    this.meshes.forEach((mesh) => {
      this.removeMesh(mesh, keepMeshes)
    })

    this.size = 0
  }

  /**
   * Destroy the {@link binding} buffer if needed and remove the {@link RenderBundle} from the {@link Renderer}.
   * @private
   */
  #cleanUp() {
    // destroy binding
    if (this.binding) {
      this.renderer.removeBuffer(this.binding.buffer)
      this.binding.buffer.destroy()
    }

    if (this.indirectBuffer) {
      this.indirectBuffer.destroy()
    }

    // remove from renderer
    this.renderer.renderBundles.delete(this.uuid)
  }

  /**
   * Remove the {@link RenderBundle}, i.e. destroy it while preserving the {@link SceneStackedMesh | scene stacked meshes} by re-adding them to the {@link core/scenes/Scene.Scene | Scene}.
   */
  remove() {
    this.empty(true)
    this.#cleanUp()
  }

  /**
   * Remove the {@link RenderBundle} from our {@link core/scenes/Scene.Scene | Scene}, {@link RenderedMesh#remove | remove the meshes}, eventually destroy the {@link binding} and remove the {@link RenderBundle} from the {@link Renderer}.
   */
  destroy() {
    this.ready = false

    this.meshes.forEach((mesh) => {
      mesh.remove()
    })

    this.size = 0

    this.#cleanUp()
  }
}
