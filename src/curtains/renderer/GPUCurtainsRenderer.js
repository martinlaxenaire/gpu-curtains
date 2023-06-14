import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  constructor({ container, pixelRatio, renderingScale = 1, camera }) {
    super({ container, pixelRatio, renderingScale, camera })

    this.type = 'CurtainsRenderer'
  }

  onCameraPositionChanged() {
    super.onCameraPositionChanged()
    this.meshes?.forEach((mesh) => mesh.updateSizePositionAndProjection())
  }

  addTexture(texture) {
    this.textures.push(texture)
  }

  // resize(boundingRect) {
  //   super.resize(boundingRect)
  // }

  onResize() {
    super.onResize()
    this.meshes?.forEach((mesh) => {
      if (mesh.domElement) {
        mesh.resize()
      }
    })
  }

  setRendererObjects() {
    super.setRendererObjects()

    this.planes = []
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  // onBeforeRenderPass() {
  //   super.onBeforeRenderPass()
  // }

  onBeginRenderPass(pass) {
    super.onBeginRenderPass(pass)

    this.meshes?.forEach((mesh) => mesh.render(pass))
  }

  // onAfterRenderPass() {
  //   super.onAfterRenderPass()
  // }

  render() {
    if (!this.ready) return

    this.textures.forEach((texture) => this.setTexture(texture))

    super.render()
  }

  destroy() {
    this.meshes.forEach((mesh) => mesh.destroy())

    this.textures.forEach((texture) => texture.destroy())

    super.destroy()
  }
}
