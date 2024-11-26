import { isRenderer, Renderer } from '../renderers/utils'
import { ProjectedMesh, RenderedMesh } from '../renderers/GPURenderer'
import { generateUUID, throwWarning } from '../../utils/utils'
import { BufferBinding } from '../bindings/BufferBinding'
import { BufferUsageKeys } from '../buffers/utils'
import { BufferBindingOffsetChild } from '../bindings/BufferBindingOffsetChild'
import { RenderPass } from './RenderPass'
import { ShaderPass } from './ShaderPass'
import { PingPongPlane } from '../../extras/meshes/PingPongPlane'

let bundleIndex = 0

/** Options used to create a {@link RenderBundle}. */
export interface RenderBundleOptions {
  /** The label of the {@link RenderBundle}, sent to various GPU objects for debugging purpose. */
  label: string
  /** The {@link RenderPass} used to describe the {@link RenderBundle#descriptor | RenderBundle encoder descriptor}. Default to the first added mesh output target if not set (usually the {@link Renderer#renderPass | renderer main render pass} or {@link Renderer#postProcessingPass | renderer post processing pass}). */
  renderPass: RenderPass
  /** Whether the {@link RenderBundle} should handle all its child {@link core/renderers/GPURenderer.ProjectedMesh | meshes} transformation matrices with a single {@link GPUBuffer}. Can greatly improve performance when dealing with a lot of moving objects, but the {@link size} parameter has to be set upon creation and should not change afterwards. */
  useBuffer: boolean
  /** Fixed size (number of meshes) of the {@link RenderBundle}. Mostly useful when using the {@link useBuffer} parameter. */
  size: number
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
 */
export class RenderBundle {
  /** The type of the {@link RenderBundle}. */
  type: string
  /** The universal unique id of the {@link RenderBundle}. */
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

  /** Optional {@link BufferBinding} created if the {@link RenderBundleParams#useBuffer | useBuffer} parameter has been set to `true` and if the {@link meshes} drawn actually have transformation matrices. This {@link BufferBinding} will act as a parent buffer, and the {@link meshes} `matrices` binding will use {core/bindings/BufferBindingOffsetChild.BufferBindingOffsetChild | BufferBindingOffsetChild} binding with the correct `offset`. */
  binding: BufferBinding | null

  /** The {@link GPURenderBundleEncoderDescriptor} created by this {@link RenderBundle}, based on the {@link RenderPass} passed as parameters. */
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
   * @param renderer - {@link Renderer} class object used to create this {@link RenderBundle}.
   * @param parameters - {@link RenderBundleParams | parameters} use to create this {@link RenderBundle}.
   */
  constructor(
    renderer: Renderer,
    {
      label = '',
      renderPass = null,
      renderOrder = 0,
      transparent = null,
      visible = true,
      size = 0,
      useBuffer = false,
    } = {} as RenderBundleParams
  ) {
    this.type = 'RenderBundle'

    renderer = isRenderer(renderer, this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    Object.defineProperty(this as RenderBundle, 'index', { value: bundleIndex++ })
    this.renderOrder = renderOrder

    this.renderer.renderBundles.push(this)

    this.transparent = transparent
    this.visible = visible

    this.options = {
      label,
      renderPass,
      useBuffer,
      size,
    }

    if (renderPass) {
      this.#setDescriptor()
    }

    this.meshes = new Map()

    this.encoder = null
    this.bundle = null
    this.#ready = false

    this.binding = null

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
   * Path the {@link binding} array and buffer size with the minimum {@link Renderer#device | device} buffer offset alignment.
   * @param size - new {@link binding} size to use.
   * @private
   */
  #patchBindingOffset(size: number) {
    const minOffset = this.renderer.device.limits.minUniformBufferOffsetAlignment

    // patch minimum uniform buffer offset
    if (this.binding.arrayBufferSize < size * minOffset) {
      this.binding.arrayBufferSize = size * minOffset
      this.binding.arrayBuffer = new ArrayBuffer(this.binding.arrayBufferSize)
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

      if (this.binding.buffer.GPUBuffer) {
        this.binding.buffer.GPUBuffer.destroy()

        this.binding.buffer.createBuffer(this.renderer, {
          label: this.binding.options.label,
          usage: [
            ...(['copySrc', 'copyDst', this.binding.bindingType] as BufferUsageKeys[]),
            ...this.binding.options.usage,
          ],
        })

        let offset = 0
        this.meshes.forEach((mesh: ProjectedMesh) => {
          mesh.patchRenderBundleBinding(offset)
          offset++
        })

        this.binding.shouldUpdate = true
      }
    }
  }

  /**
   * Set the new {@link RenderBundle} size.
   * @param value - New size to set.
   */
  set size(value: number) {
    if (value !== this.options.size) {
      if (this.ready && !this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not change its size after it has been created.`
        )
      }

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
    return this.#ready
  }

  /**
   * Set whether our {@link RenderBundle} is ready and encode it if needed.
   * @param value - New ready state.
   */
  set ready(value: boolean) {
    if (value && !this.ready) {
      // finally ready
      this.#encodeRenderCommands()
    } else if (!value && this.ready) {
      // invalidate
      this.bundle = null
    }

    this.#ready = value
  }

  /**
   * Add a {@link RenderedMesh | mesh} to this {@link RenderBundle}. Can set the {@link RenderBundleOptions#renderPass | render pass} if needed. If the {@link RenderBundleOptions#renderPass | render pass} is already set and the {@link mesh} output {@link RenderPass} does not match, it won't be added.
   * @param mesh - {@link RenderedMesh | Mesh} to eventually add.
   * @param outputPass - The mesh output {@link RenderPass}.
   */
  addMesh(mesh: RenderedMesh, outputPass: RenderPass) {
    // check for correct render pass first?
    if (!this.options.renderPass) {
      this.options.renderPass = outputPass
      this.#setDescriptor()
    } else if (outputPass.uuid !== this.options.renderPass.uuid) {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because the output render passes do not match.`
      )

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

    this.size = this.meshes.size
  }

  /**
   * Remove a {@link mesh} from this {@link RenderBundle}.
   * @param mesh - {@link RenderedMesh | Mesh} to remove.
   * @param keepMesh - Whether to preserve the {@link mesh} in order to render it normally again. Default to `true`.
   */
  removeMesh(mesh: RenderedMesh, keepMesh = true) {
    if (this.ready && !this.renderer.production) {
      throwWarning(
        `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not remove meshes from it after it has been created (mesh removed: ${mesh.options.label}).`
      )
    }

    this.ready = false
    this.meshes.delete(mesh.uuid)

    mesh.setRenderBundle(null, false)

    this.size = this.meshes.size

    if (keepMesh) {
      if (mesh.type === 'ShaderPass') {
        this.renderer.scene.addShaderPass(mesh as ShaderPass)
      } else if (mesh.type === 'PingPongPlane') {
        this.renderer.scene.addPingPongPlane(mesh as PingPongPlane)
      } else {
        this.renderer.scene.addMesh(mesh)
      }
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
   * Create the {@link encoder} and {@link bundle} used by this {@link RenderBundle}.
   * @private
   */
  #encodeRenderCommands() {
    this.renderer.pipelineManager.resetCurrentPipeline()

    this.encoder = this.renderer.device.createRenderBundleEncoder({
      ...this.descriptor,
      label: this.options.label + ' (encoder)',
    })

    // render commands
    this.meshes.forEach((mesh) => {
      mesh.material.render(this.encoder)
      mesh.geometry.render(this.encoder)
    })

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
   * Render the {@link RenderBundle}.
   *
   * If it is ready, execute each {@link RenderedMesh#onBeforeRenderPass | mesh onBeforeRenderPass method}, {@link updateBinding | update the binding} if needed, execute the {@link bundle} and finally execute each {@link RenderedMesh#onAfterRenderPass | mesh onAfterRenderPass method}.
   *
   * If not, just render its {@link meshes} as usual and check whether they are all ready and if we can therefore encode our {@link RenderBundle}.
   * @param pass - {@link GPURenderPassEncoder} to use.
   */
  render(pass: GPURenderPassEncoder) {
    // render bundle ready, render meshes
    if (this.ready && this.bundle && this.visible) {
      this.meshes.forEach((mesh) => {
        mesh.onBeforeRenderPass()
      })

      // update transformations binding if needed
      this.updateBinding()

      // force pipeline resets before and after executing the bundle
      this.renderer.pipelineManager.resetCurrentPipeline()
      pass.executeBundles([this.bundle])
      this.renderer.pipelineManager.resetCurrentPipeline()

      this.meshes.forEach((mesh) => {
        mesh.onAfterRenderPass()
      })
    }

    // bundle not ready?
    // render meshes as usual
    if (!this.ready) {
      let isReady = true

      for (const [_key, mesh] of this.meshes) {
        mesh.render(pass)

        if (!mesh.ready) {
          isReady = false
        }
      }

      this.ready = isReady
    }
  }

  /**
   * Called when the {@link Renderer#device | WebGPU device} has been lost.
   * Just set the {@link ready} flag to `false` to eventually invalidate the {@link bundle}.
   */
  loseContext() {
    this.ready = false
  }

  /**
   * Destroy the {@link RenderBundle} but preserve the {@link meshes} and render them normally again.
   */
  remove() {
    this.destroy(true)
  }

  /**
   * Remove the {@link RenderBundle} from our {@link core/scenes/Scene.Scene | Scene} and eventually destroy the {@link binding}. Can also reset all the {@link meshes} so they can be drawn normally again.
   * @param keepMeshes - Whether to preserve the {@link meshes} in order to render them normally again.
   */
  destroy(keepMeshes = false) {
    this.ready = false
    this.renderer.scene.removeRenderBundle(this)

    this.meshes.forEach((mesh) => {
      this.meshes.delete(mesh.uuid)

      mesh.setRenderBundle(null, false)

      if (keepMeshes) {
        this.renderer.scene.addMesh(mesh)
      }
    })

    // destroy binding
    if (this.binding) {
      this.binding.buffer.destroy()
    }
  }
}
