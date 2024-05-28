import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer.mjs';

class GPUCurtainsRenderer extends GPUCameraRenderer {
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
    alphaMode = "premultiplied",
    renderPass,
    camera
  }) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      preferredFormat,
      alphaMode,
      renderPass,
      camera
    });
    this.type = "GPUCurtainsRenderer";
  }
  /**
   * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements
   */
  setRendererObjects() {
    super.setRendererObjects();
    this.domMeshes = [];
    this.domObjects = [];
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
