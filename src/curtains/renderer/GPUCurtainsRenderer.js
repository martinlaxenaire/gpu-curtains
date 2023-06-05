import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  constructor({ container, pixelRatio, renderingScale = 1, camera = {} }) {
    super({ container, pixelRatio, renderingScale, camera })

    this.type = 'CurtainsRenderer'

    this.setRendererObjects()
  }

  onCameraPositionChanged() {
    super.onCameraPositionChanged()
    this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
  }

  setRendererObjects() {
    // keep track of planes, textures, etc.
    this.planes = []
    this.textures = []
  }

  addTexture(texture) {
    this.textures.push(texture)
  }

  resize(boundingRect) {
    super.resize(boundingRect)
  }

  onResize() {
    super.onResize()
    this.planes?.forEach((plane) => plane.resize())
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  onBeforeRenderPass() {
    super.onBeforeRenderPass()
  }

  onBeginRenderPass(pass) {
    super.onBeginRenderPass(pass)

    this.planes?.forEach((plane) => plane.render(pass))
  }

  onAfterRenderPass() {
    super.onAfterRenderPass()
  }

  render() {
    if (!this.ready) return

    this.textures.forEach((texture) => this.setTexture(texture))

    super.render()
  }

  destroy() {
    this.planes.forEach((plane) => plane.destroy())

    this.textures.forEach((texture) => texture.destroy())

    super.destroy()
  }
}
