import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer'
import { DOMMesh } from '../meshes/DOMMesh'
import { Plane } from '../meshes/Plane'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  constructor({
    container,
    pixelRatio = 1,
    renderingScale = 1,
    sampleCount = 4,
    preferredFormat,
    production = false,
    camera,
  }) {
    super({ container, pixelRatio, renderingScale, sampleCount, preferredFormat, production, camera })

    this.type = 'CurtainsRenderer'
  }

  onCameraPositionChanged() {
    super.onCameraPositionChanged()
    this.domMeshes?.forEach((mesh) => mesh.updateSizePositionAndProjection())
  }

  // resize(boundingRect) {
  //   super.resize(boundingRect)
  // }

  // get domMeshes() {
  //   return /** @type {Array<DOMMesh | Plane>} **/ this.meshes.filter(
  //     (mesh) => mesh instanceof DOMMesh || mesh instanceof Plane
  //   )
  // }

  setRendererObjects() {
    super.setRendererObjects()

    this.domMeshes = []
  }

  onResize() {
    super.onResize()
    this.domMeshes?.forEach((mesh) => {
      if (mesh.domElement && !mesh.domElement.isResizing) {
        mesh.resize()
      }
    })
  }

  // setRendererObjects() {
  //   super.setRendererObjects()
  //
  //   this.planes = []
  // }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  // onBeforeRenderPass() {
  //   super.onBeforeRenderPass()
  // }

  // onBeginRenderPass(pass) {
  //   super.onBeginRenderPass(pass)
  // }

  // onAfterRenderPass() {
  //   super.onAfterRenderPass()
  // }

  // render() {
  //   if (!this.ready) return
  //
  //   this.textures.forEach((texture) => this.setTexture(texture))
  //
  //   super.render()
  // }

  // destroy() {
  //   this.meshes.forEach((mesh) => mesh.destroy())
  //
  //   this.textures.forEach((texture) => texture.destroy())
  //
  //   super.destroy()
  // }
}
