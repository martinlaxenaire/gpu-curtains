import { PerspectiveCamera } from '../../core/cameras/PerspectiveCamera'
import { GPUCameraRenderer, GPUCameraRendererParams, RendererCamera } from '../../core/renderers/GPUCameraRenderer'
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer'
import { DOMObject3D } from '../objects3D/DOMObject3D'
import { DOMTexture } from '../textures/DOMTexture'

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
 * @template TCamera - The camera type parameter which extends {@link RendererCamera}. Default is {@link PerspectiveCamera}.
 */
export class GPUCurtainsRenderer<
  TCamera extends RendererCamera = PerspectiveCamera
> extends GPUCameraRenderer<TCamera> {
  /** All created {@link curtains/meshes/DOMMesh.DOMMesh | DOM Meshes} and {@link curtains/meshes/Plane.Plane | planes}. */
  domMeshes: DOMProjectedMesh[]
  /** All created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll. */
  domObjects: DOMObject3D[]
  /** An array containing all our created {@link DOMTexture}. */
  // TODO not really needed is it?
  domTextures: DOMTexture[]

  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}.
   */
  constructor({
    deviceManager,
    label,
    container,
    pixelRatio = 1,
    autoResize = true,
    context = {},
    renderPass,
    camera,
    lights,
  }: GPUCameraRendererParams) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      context,
      renderPass,
      camera,
      lights,
    } as GPUCameraRendererParams)

    this.type = 'GPUCurtainsRenderer'
  }

  /**
   * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements.
   */
  setRendererObjects() {
    super.setRendererObjects()

    this.domMeshes = []
    this.domObjects = []
    this.domTextures = []
  }

  /**
   * Add a {@link DOMTexture} to our {@link domTextures | DOM textures array}.
   * @param texture - {@link DOMTexture} to add.
   */
  addDOMTexture(texture: DOMTexture) {
    this.domTextures.push(texture)
  }

  /**
   * Remove a {@link DOMTexture} from our {@link domTextures | textures array}.
   * @param texture - {@link DOMTexture} to remove.
   */
  removeDOMTexture(texture: DOMTexture) {
    this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid)
  }

  /**
   * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/cameras/PerspectiveCamera.PerspectiveCamera#position | position} or {@link core/cameras/PerspectiveCamera.PerspectiveCamera#size | size} changed.
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
