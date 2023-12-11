import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { DOMMeshType } from '../../core/renderers/GPURenderer'

/**
 * GPUCurtainsRenderer class:
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created [DOM Meshes]{@link DOMMesh}
 * @extends GPUCameraRenderer
 */
export class GPUCurtainsRenderer extends GPUCameraRenderer {
  /** All created [DOM Meshes]{@link DOMMesh} and [planes]{@link Plane} */
  domMeshes: DOMMeshType[]

  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCurtainsRenderer}
   */
  constructor({
    container,
    pixelRatio = 1,
    sampleCount = 4,
    preferredFormat,
    alphaMode = 'premultiplied',
    production = false,
    onError = () => {
      /* allow empty callbacks */
    },
    onContextLost = (info?: GPUDeviceLostInfo) => {
      /* allow empty callbacks */
    },
    camera,
  }: GPUCameraRendererParams) {
    super({
      container,
      pixelRatio,
      sampleCount,
      preferredFormat,
      alphaMode,
      production,
      onError,
      onContextLost,
      camera,
    } as GPUCameraRendererParams)

    this.type = 'GPUCurtainsRenderer'
  }

  /**
   * Add the [DOM Meshes]{@link GPUCurtainsRenderer#domMeshes} to our tracked elements
   */
  setRendererObjects() {
    super.setRendererObjects()

    this.domMeshes = []
  }

  /**
   * Set each [DOM Meshes DOM Elements]{GPUCurtainsRenderer#domMeshes.domElement} size on resize
   */
  onResize() {
    super.onResize()
    this.domMeshes?.forEach((mesh) => {
      if (mesh.domElement) {
        mesh.domElement.setSize()
      }
    })
  }
}
