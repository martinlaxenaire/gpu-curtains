import { GPURenderer } from './GPURenderer.mjs';
import { Camera } from '../camera/Camera.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { BindGroup } from '../bindGroups/BindGroup.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

class GPUCameraRenderer extends GPURenderer {
  /**
   * GPUCameraRenderer constructor
   * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
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
    camera = {}
  }) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      preferredFormat,
      alphaMode,
      renderPass
    });
    this.type = "GPUCameraRenderer";
    camera = { ...{ fov: 50, near: 0.1, far: 150 }, ...camera };
    this.options = {
      ...this.options,
      camera
    };
    this.setCamera(camera);
    this.setCameraBindGroupAndBinding();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
   * Reset all our samplers, force all our scene objects and camera bind group to lose context.
   */
  loseContext() {
    super.loseContext();
    this.cameraBindGroup.loseContext();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} should be restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/RenderTexture.RenderTexture | render textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBufferBinding | camera buffer binding}.
   * @async
   */
  async restoreContext() {
    this.cameraBufferBinding.shouldUpdate = true;
    return super.restoreContext();
  }
  /**
   * Set the {@link camera}
   * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
   */
  setCamera(cameraParameters) {
    const { width, height } = this.rectBBox;
    this.camera = new Camera({
      fov: cameraParameters.fov,
      near: cameraParameters.near,
      far: cameraParameters.far,
      width,
      height,
      pixelRatio: this.pixelRatio,
      onMatricesChanged: () => {
        this.onCameraMatricesChanged();
      }
    });
  }
  /**
   * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings();
    this.meshes.forEach((mesh) => {
      if ("modelViewMatrix" in mesh) {
        mesh.shouldUpdateMatrixStack();
      }
    });
  }
  /**
   * Set the {@link cameraBufferBinding | camera buffer binding} and {@link cameraBindGroup | camera bind group}
   */
  setCameraBindGroupAndBinding() {
    this.cameraBufferBinding = new BufferBinding({
      label: "Camera",
      name: "camera",
      visibility: "vertex",
      struct: {
        model: {
          // camera model matrix
          name: "model",
          type: "mat4x4f",
          value: this.camera.modelMatrix
        },
        view: {
          // camera view matrix
          name: "view",
          type: "mat4x4f",
          value: this.camera.viewMatrix
        },
        projection: {
          // camera projection matrix
          name: "projection",
          type: "mat4x4f",
          value: this.camera.projectionMatrix
        }
      }
    });
    this.cameraBindGroup = new BindGroup(this, {
      label: "Camera Uniform bind group",
      bindings: [this.cameraBufferBinding]
    });
  }
  /**
   * Create the {@link cameraBindGroup | camera bind group} buffers
   */
  setCameraBindGroup() {
    if (this.cameraBindGroup && this.cameraBindGroup.shouldCreateBindGroup) {
      this.cameraBindGroup.setIndex(0);
      this.cameraBindGroup.createBindGroup();
    }
  }
  /**
   * Tell our {@link cameraBufferBinding | camera buffer binding} that we should update its struct
   */
  updateCameraBindings() {
    this.cameraBufferBinding?.shouldUpdateBinding("model");
    this.cameraBufferBinding?.shouldUpdateBinding("view");
    this.cameraBufferBinding?.shouldUpdateBinding("projection");
  }
  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraBindGroup | camera bind group}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to check
   */
  getObjectsByBindGroup(bindGroup) {
    return this.deviceRenderedObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups,
        this.cameraBindGroup
      ].some((bG) => bG.uuid === bindGroup.uuid);
    });
  }
  /**
   * Set our {@link camera} perspective matrix new parameters (fov, near plane and far plane)
   * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
   */
  setPerspective({ fov, near, far } = {}) {
    this.camera?.setPerspective({
      fov,
      near,
      far,
      width: this.rectBBox.width,
      height: this.rectBBox.height,
      pixelRatio: this.pixelRatio
    });
  }
  /**
   * Set our {@link camera} {@link Camera#position | position}
   * @param position - new {@link Camera#position | position}
   */
  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.camera.position.copy(position);
  }
  /**
   * Call our {@link GPURenderer#onResize | GPURenderer onResize method} and resize our {@link camera} as well
   */
  onResize() {
    super.onResize();
    this.setPerspective();
    this.updateCameraBindings();
  }
  /* RENDER */
  /**
   * Update the camera model matrix, check if the {@link cameraBindGroup | camera bind group} should be created, create it if needed and then update it
   */
  updateCamera() {
    this.camera?.updateMatrixStack();
    this.setCameraBindGroup();
    this.cameraBindGroup?.update();
  }
  /**
   * Render a single {@link RenderedMesh | mesh} (binds the {@link cameraBindGroup | camera bind group} if needed)
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param mesh - {@link RenderedMesh | mesh} to render
   */
  renderSingleMesh(commandEncoder, mesh) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
    if (mesh.material.options.rendering.useProjection) {
      pass.setBindGroup(this.cameraBindGroup.index, this.cameraBindGroup.bindGroup);
    }
    mesh.render(pass);
    pass.end();
  }
  /**
   * {@link updateCamera | Update the camera} and then call our {@link GPURenderer#render | GPURenderer render method}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder) {
    if (!this.ready)
      return;
    this.updateCamera();
    super.render(commandEncoder);
  }
  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraBindGroup?.destroy();
    super.destroy();
  }
}

export { GPUCameraRenderer };
