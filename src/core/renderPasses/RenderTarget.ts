import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { RenderPass } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { RenderPassParams } from './RenderPass'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { DOMElementBoundingRect } from '../DOM/DOMElement'

export interface RenderTargetParams extends RenderPassParams {
  autoAddToScene?: boolean
}

export class RenderTarget {
  renderer: Renderer
  type: string
  uuid: string

  options: RenderTargetParams

  renderPass: RenderPass
  renderTexture: RenderTexture

  #autoAddToScene = true

  constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderTarget')

    this.type = 'RenderTarget'
    this.renderer = renderer
    this.uuid = generateUUID()

    const { label, depth, loadOp, clearValue, autoAddToScene } = parameters

    this.options = {
      label,
      depth,
      loadOp,
      clearValue,
      autoAddToScene,
    }

    if (autoAddToScene !== undefined) {
      this.#autoAddToScene = autoAddToScene
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      depth: this.options.depth,
      loadOp: this.options.loadOp,
      clearValue: this.options.clearValue,
    })

    this.renderTexture = new RenderTexture(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target Render Texture',
      name: 'renderTexture',
    } as RenderTextureParams)

    this.addToScene()
  }

  addToScene() {
    this.renderer.renderTargets.push(this)

    if (this.#autoAddToScene) {
      this.renderer.scene.addRenderTarget(this)
    }
  }

  removeFromScene() {
    if (this.#autoAddToScene) {
      this.renderer.scene.removeRenderTarget(this)
    }

    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid)
  }

  resize(boundingRect: DOMElementBoundingRect) {
    this.renderPass?.resize(boundingRect)
    this.renderTexture?.resize()
  }

  // alias
  remove() {
    this.destroy()
  }

  destroy() {
    // release mesh bindings
    this.renderer.meshes.forEach((mesh) => {
      if (mesh.renderTarget && mesh.renderTarget.uuid === this.uuid) {
        mesh.setRenderTarget(null)
      }
    })

    // release shader passes bindings
    this.renderer.shaderPasses.forEach((shaderPass) => {
      if (shaderPass.renderTarget && shaderPass.renderTarget.uuid === this.uuid) {
        // force render target to null before removing / re-adding to scene
        shaderPass.renderTarget = null
        shaderPass.setRenderTarget(null)
      }
    })

    // remove from scene and renderer array
    this.removeFromScene()

    this.renderPass?.destroy()
    this.renderTexture?.destroy()
  }
}
