import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  constructor({
    container,
    pixelRatio = 1,
    sampleCount = 4,
    preferredFormat,
    production = false,
    onError = () => {
      /* allow empty callbacks */
    },
    camera,
  }) {
    super({ container, pixelRatio, sampleCount, preferredFormat, production, onError, camera })

    this.type = 'GPUCurtainsRenderer'
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
      if (mesh.domElement) {
        mesh.domElement.setSize()
      }
    })
  }
}
