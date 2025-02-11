import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer.mjs';

class GPUCurtainsRenderer extends GPUCameraRenderer {
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
    lights
  }) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      context,
      renderPass,
      camera,
      lights
    });
    this.type = "GPUCurtainsRenderer";
  }
  /**
   * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements.
   */
  setRendererObjects() {
    super.setRendererObjects();
    this.domMeshes = [];
    this.domObjects = [];
    this.domTextures = [];
  }
  /**
   * Add a {@link DOMTexture} to our {@link domTextures | DOM textures array}.
   * @param texture - {@link DOMTexture} to add.
   */
  addDOMTexture(texture) {
    this.domTextures.push(texture);
  }
  /**
   * Remove a {@link DOMTexture} from our {@link domTextures | textures array}.
   * @param texture - {@link DOMTexture} to remove.
   */
  removeDOMTexture(texture) {
    this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid);
  }
  /**
   * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/camera/Camera.Camera#position | position} or {@link core/camera/Camera.Camera#size | size} change.
   */
  onCameraMatricesChanged() {
    super.onCameraMatricesChanged();
    this.domObjects.forEach((domObject) => {
      domObject.updateSizeAndPosition();
    });
  }
  /**
   * Resize the {@link meshes}.
   */
  resizeMeshes() {
    this.meshes.forEach((mesh) => {
      if (!("domElement" in mesh)) {
        mesh.resize(this.boundingRect);
      }
    });
    this.domObjects.forEach((domObject) => {
      if (!domObject.domElement.isResizing) {
        domObject.domElement.setSize();
      }
    });
  }
}

export { GPUCurtainsRenderer };
