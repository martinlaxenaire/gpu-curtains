import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer'

/**
 * GPUCurtainsRenderer class:
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created [DOM Meshes]{@link DOMMesh}
 * @extends GPUCameraRenderer
 */
export class GPUCurtainsRenderer extends GPUCameraRenderer {
  /** All created [DOM Meshes]{@link DOMMesh} and [planes]{@link Plane} */
  domMeshes: DOMProjectedMesh[]

  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCurtainsRenderer}
   */
  constructor({
    deviceManager,
    container,
    pixelRatio = 1,
    sampleCount = 4,
    preferredFormat,
    alphaMode = 'premultiplied',
    camera,
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      container,
      pixelRatio,
      sampleCount,
      preferredFormat,
      alphaMode,
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
}
