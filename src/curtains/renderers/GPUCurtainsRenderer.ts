import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { DOMMeshType } from '../../core/renderers/GPURenderer'

export class GPUCurtainsRenderer extends GPUCameraRenderer {
  domMeshes: DOMMeshType[]

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
  }: GPUCameraRendererParams) {
    super({
      container,
      pixelRatio,
      sampleCount,
      preferredFormat,
      production,
      onError,
      camera,
    } as GPUCameraRendererParams)

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
