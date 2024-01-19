import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer'

/**
 * This renderer just extends the {@link GPUCameraRenderer} by keeping track of all the created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes}
 *
 * @example
 * ```javascript
 * // first, we need a WebGPU device, that's what GPUDeviceManager is for
 * const gpuDeviceManager = new GPUDeviceManager({
 *   label: 'Custom device manager',
 * })
 *
 * // we need to wait for the WebGPU device to be created
 * await gpuDeviceManager.init()
 *
 * // then we can create a curtains renderer
 * const gpuCurtainsRenderer = new GPUCurtainsRenderer({
 *   deviceManager: gpuDeviceManager, // we need the WebGPU device to create the renderer context
 *   container: document.querySelector('#canvas'),
 * })
 * ```
 */
export class GPUCurtainsRenderer extends GPUCameraRenderer {
  /** All created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes} and {@link curtains/meshes/Plane.Plane | planes} */
  domMeshes: DOMProjectedMesh[]

  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
   */
  constructor({
    deviceManager,
    container,
    pixelRatio = 1,
    preferredFormat,
    alphaMode = 'premultiplied',
    multisampled = true,
    renderPass,
    camera,
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      container,
      pixelRatio,
      preferredFormat,
      alphaMode,
      renderPass,
      multisampled,
      camera,
    } as GPUCameraRendererParams)

    this.type = 'GPUCurtainsRenderer'
  }

  /**
   * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements
   */
  setRendererObjects() {
    super.setRendererObjects()

    this.domMeshes = []
  }
}
