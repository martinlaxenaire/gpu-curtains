import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer'
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer'
import { DOMObject3D } from '../objects3D/DOMObject3D'

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
  /** All created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll. */
  domObjects: DOMObject3D[]

  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
   */
  constructor({
    deviceManager,
    label,
    container,
    pixelRatio = 1,
    autoResize = true,
    preferredFormat,
    alphaMode = 'premultiplied',
    renderPass,
    camera,
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      preferredFormat,
      alphaMode,
      renderPass,
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
    this.domObjects = []
  }

  /**
   * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/camera/Camera.Camera#position | position} or {@link core/camera/Camera.Camera#size | size} change.
   */
  onCameraMatricesChanged() {
    super.onCameraMatricesChanged()

    this.domObjects.forEach((domObject) => {
      domObject.updateSizeAndPosition()
    })
  }

  /**
   * Resize the {@link meshes}.
   */
  resizeMeshes() {
    this.meshes.forEach((mesh) => {
      if (!('domElement' in mesh)) {
        // resize meshes that do not have a bound DOM element
        mesh.resize(this.boundingRect)
      }
    })

    // resize dom objects as well
    this.domObjects.forEach((domObject) => {
      // update position for DOM objects only if they're not currently being resized
      if (!domObject.domElement.isResizing) {
        domObject.domElement.setSize()
      }
    })
  }
}
