import { isRenderer } from '../../utils/renderer-utils'
import { RenderPass } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { generateUUID } from '../../utils/utils'

export class RenderTarget {
  constructor(renderer, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, 'RenderTarget')

    this.type = 'RenderTarget'
    this.renderer = renderer
    this.uuid = generateUUID()

    const { label, depth, loadOp } = parameters
    this.options = {
      label,
      depth,
      loadOp,
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      depth: this.options.depth,
      loadOp: this.options.loadOp,
    })

    this.renderTexture = new RenderTexture(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target Render Texture',
      name: 'renderTexture',
    })

    this.addToScene()
  }

  addToScene() {
    this.renderer.renderTargets.push(this)
    this.renderer.scene.addRenderTarget(this)
  }

  removeFromScene() {
    this.renderer.scene.removeRenderTarget(this)
    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid)
  }

  resize(boundingRect) {
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
