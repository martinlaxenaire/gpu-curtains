import { isRenderer, Renderer } from '../renderers/utils'
import { RenderedMesh } from '../renderers/GPURenderer'
import { generateUUID, throwWarning } from '../../utils/utils'
import { RenderTarget } from './RenderTarget'
import { ProjectionType } from '../scenes/Scene'
import { BufferBinding } from '../bindings/BufferBinding'
import { BufferUsageKeys } from '../buffers/utils'
import { BufferBindingOffsetChild } from '../bindings/BufferBindingOffsetChild'
import { RenderPass } from './RenderPass'

let bundleIndex = 0

export interface RenderBundleParams {
  label?: string
  renderPass?: RenderPass

  useTransformationBuffer?: boolean
  size?: number
}

export interface RenderBundleStack {
  transparent: boolean
  projection: ProjectionType
  renderOrder: number
}

export interface RenderBundleOptions extends RenderBundleParams, Partial<RenderBundleStack> {}

export class RenderBundle {
  type: string
  uuid: string
  renderer: Renderer

  options: RenderBundleOptions

  index: number
  renderOrder: number

  binding: BufferBinding | null

  descriptor: GPURenderBundleEncoderDescriptor
  encoder: GPURenderBundleEncoder | null
  bundle: GPURenderBundle | null

  meshes: Map<RenderedMesh['uuid'], RenderedMesh>

  #ready: boolean

  constructor(
    renderer: Renderer,
    {
      label = '',
      renderPass = null,
      renderOrder = 0,
      size = 1,
      useTransformationBuffer = false,
    } = {} as RenderBundleParams
  ) {
    this.type = 'RenderPass'

    renderer = isRenderer(renderer, this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    if (!renderPass) {
      renderPass = this.renderer.renderPass
    }

    Object.defineProperty(this as RenderBundle, 'index', { value: bundleIndex++ })
    this.renderOrder = renderOrder

    this.renderer.renderBundles.push(this)

    this.options = {
      label,
      renderPass,
      useTransformationBuffer,
      size,
    }

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

    this.meshes = new Map()

    this.encoder = null
    this.bundle = null
    this.#ready = false

    this.binding = null

    if (this.options.useTransformationBuffer) {
      this.setBinding()
    }
  }

  setBinding() {
    this.binding = new BufferBinding({
      label: 'Matrices',
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

    this.patchBindingOffset(this.options.size)
  }

  patchBindingOffset(size: number) {
    const minOffset = this.renderer.device.limits.minUniformBufferOffsetAlignment

    // patch minimum uniform buffer offset
    if (this.binding.arrayBufferSize < size * minOffset) {
      this.binding.arrayBufferSize = size * minOffset
      this.binding.arrayBuffer = new ArrayBuffer(this.binding.arrayBufferSize)
      this.binding.buffer.size = this.binding.arrayBuffer.byteLength
    }
  }

  onSizeChanged(newSize: number) {
    if (newSize > this.options.size && this.binding) {
      this.patchBindingOffset(newSize)

      if (this.binding.buffer.GPUBuffer) {
        this.binding.buffer.GPUBuffer.destroy()

        this.binding.buffer.createBuffer(this.renderer, {
          label: this.options.label + ': ' + this.binding.bindingType + ' buffer from: ' + this.binding.label,
          usage: [
            ...(['copySrc', 'copyDst', this.binding.bindingType] as BufferUsageKeys[]),
            ...this.binding.options.usage,
          ],
        })

        this.meshes.forEach((mesh) => {
          const matrices = mesh.material.getBufferBindingByName('matrices')
          matrices.shouldResetBindGroup = true
        })
      }
    }
  }

  set size(value: number) {
    if (value !== this.options.size) {
      if (this.ready && !this.renderer.production) {
        throwWarning(
          this.type +
            ': The content of a render bundle is meant to be static. You should not change its size after it has been created.'
        )
      }

      this.onSizeChanged(value)

      this.options.size = value
    }
  }

  get ready(): boolean {
    return this.#ready
  }

  set ready(value: boolean) {
    if (value && !this.ready) {
      // finally ready
      this.encodeRenderCommands()
    } else if (!value && this.ready) {
      // invalidate
      this.bundle = null
    }

    this.#ready = value
  }

  get count(): number {
    return this.meshes.size
  }

  setStack({ transparent = false, projection = 'projected' }: RenderBundleStack) {
    this.options = { ...this.options, transparent, projection }
  }

  addMesh(mesh: RenderedMesh) {
    if (this.ready && !this.renderer.production) {
      throwWarning(
        this.type +
          ': The content of a render bundle is meant to be static. You should not add meshes to it after it has been created.'
      )
    }

    this.ready = false
    this.meshes.set(mesh.uuid, mesh)
  }

  resetMesh(mesh: RenderedMesh) {
    mesh.options.renderBundle = null

    if (this.binding && mesh.material.options.rendering.useProjection) {
      // reset bind group and original meshes matrices bindings
      const bindGroup = mesh.material.getBindGroupByBindingName('matrices')
      const matrices = mesh.material.getBufferBindingByName('matrices')

      ;(matrices as BufferBindingOffsetChild).parent = null
      matrices.shouldResetBindGroup = true

      bindGroup.createBindingBuffer(matrices)
    }
  }

  removeMesh(mesh: RenderedMesh) {
    if (!this.renderer.production) {
      throwWarning(
        this.type +
          ': The content of a render bundle is meant to be static. You should not remove meshes from it after it has been created.'
      )
    }

    this.ready = false
    this.meshes.delete(mesh.uuid)

    this.resetMesh(mesh)

    this.renderer.scene.addMesh(mesh)
  }

  encodeRenderCommands() {
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

  render(pass: GPURenderPassEncoder) {
    // render bundle ready, render meshes
    if (this.ready && this.bundle) {
      this.meshes.forEach((mesh) => {
        mesh.onBeforeRenderPass()
      })

      // update transformations binding if needed
      if (this.binding && this.binding.shouldUpdate && this.binding.buffer.GPUBuffer) {
        this.renderer.queueWriteBuffer(this.binding.buffer.GPUBuffer, 0, this.binding.arrayBuffer)

        this.binding.shouldUpdate = false
      }

      pass.executeBundles([this.bundle])

      this.meshes.forEach((mesh) => {
        mesh.onAfterRenderPass()
      })
    }

    // bundle not ready?
    // render meshes as usual
    if (!this.ready) {
      let isReady = true
      let readyCount = 0

      for (const [_key, mesh] of this.meshes) {
        mesh.render(pass)

        if (!mesh.ready) {
          isReady = false
        } else {
          readyCount++
        }
      }

      this.ready = isReady
    }
  }

  loseContext() {
    this.ready = false
  }

  remove() {
    this.ready = false
    this.renderer.scene.removeBundle(this)
    this.meshes.forEach((mesh) => {
      this.meshes.delete(mesh.uuid)

      this.resetMesh(mesh)
      this.renderer.scene.addMesh(mesh)
    })

    // destroy binding
    if (this.binding) {
      this.binding.buffer.destroy()
    }
  }

  destroy() {
    this.ready = false
    this.renderer.scene.removeBundle(this)
    this.meshes.forEach((mesh) => {
      this.meshes.delete(mesh.uuid)

      mesh.options.renderBundle = null
    })

    // destroy binding
    if (this.binding) {
      this.binding.buffer.destroy()
    }
  }
}
