import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer'

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
}
