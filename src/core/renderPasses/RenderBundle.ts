import { isRenderer, Renderer } from '../renderers/utils'
import { RenderedMesh } from '../renderers/GPURenderer'

export class RenderBundle {
  type: string
  renderer: Renderer

  descriptor: GPURenderBundleEncoderDescriptor
  encoder: GPURenderBundleEncoder | null
  bundle: GPURenderBundle | null

  meshes: Map<RenderedMesh['uuid'], RenderedMesh>

  #ready: boolean

  constructor(renderer: Renderer) {
    this.type = 'RenderPass'

    renderer = isRenderer(renderer, this.type)

    this.renderer = renderer

    // TODO label!

    this.meshes = new Map()

    this.encoder = null
    this.bundle = null
    this.#ready = false
  }

  static getDescriptorFromMesh(mesh: RenderedMesh): GPURenderBundleEncoderDescriptor {
    return {
      colorFormats: mesh.material.options.rendering.targets.map((target) => target.format),
      depthStencilFormat: mesh.material.options.rendering.depthFormat,
      sampleCount: mesh.material.options.rendering.sampleCount,
    }
  }

  get ready(): boolean {
    return this.#ready
  }

  set ready(value: boolean) {
    if (value && !this.ready) {
      // finally ready
      this.encodeRenderCommands()
      this.cleanupMainScene()
    } else if (!value && this.ready) {
      // invalidate
    }

    this.#ready = value
  }

  createFromMesh(mesh: RenderedMesh) {
    this.descriptor = RenderBundle.getDescriptorFromMesh(mesh)

    this.addMesh(mesh)
  }

  addMesh(mesh: RenderedMesh) {
    this.ready = false
    this.meshes.set(mesh.uuid, mesh)
  }

  removeMesh(mesh: RenderedMesh) {
    this.ready = false
    this.meshes.delete(mesh.uuid)
  }

  cleanupMainScene() {
    this.meshes.forEach((mesh) => {
      const projectionStack = this.renderer.scene.getMeshProjectionStack(mesh)

      if (mesh.transparent) {
        projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid)
      } else {
        projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid)
      }
    })
  }

  encodeRenderCommands() {
    this.renderer.pipelineManager.resetCurrentPipeline()

    this.encoder = this.renderer.device.createRenderBundleEncoder(this.descriptor)

    // render commands
    this.meshes.forEach((mesh) => {
      mesh.material.render(this.encoder)
      mesh.geometry.render(this.encoder)
    })

    this.bundle = this.encoder.finish()

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  render(pass: GPURenderPassEncoder) {
    let isReady = true
    for (const [_key, mesh] of this.meshes) {
      if (!mesh.ready) {
        isReady = false
        break
      }
    }

    this.ready = isReady

    // render bundle ready, render meshes
    if (this.ready && this.bundle) {
      this.meshes.forEach((mesh) => {
        mesh.onBeforeRenderPass()
      })

      //console.log('execure bundle')
      pass.executeBundles([this.bundle])

      this.meshes.forEach((mesh) => {
        mesh.onAfterRenderPass()
      })
    }
  }
}
