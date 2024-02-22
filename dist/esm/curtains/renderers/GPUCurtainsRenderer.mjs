import { GPUCameraRenderer } from '../../core/renderers/GPUCameraRenderer.mjs';

class GPUCurtainsRenderer extends GPUCameraRenderer {
  /**
   * GPUCurtainsRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
   */
  constructor({
    deviceManager,
    container,
    pixelRatio = 1,
    preferredFormat,
    alphaMode = "premultiplied",
    renderPass,
    camera
  }) {
    super({
      deviceManager,
      container,
      pixelRatio,
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
  }
}

export { GPUCurtainsRenderer };
//# sourceMappingURL=GPUCurtainsRenderer.mjs.map
