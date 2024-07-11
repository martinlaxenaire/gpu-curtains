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
    camera = { ...{ fov: 50, near: 0.1, far: 1e3 }, ...camera };
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
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBufferBinding | camera buffer binding}.
   * @async
   */
  restoreContext() {
    super.restoreContext();
    this.cameraBindGroup?.restoreContext();
    this.updateCameraBindings();
  }
  /**
   * Set the {@link camera}
   * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
   */
  setCamera(cameraParameters) {
    const { width, height } = this.rectBBox;
    this.useCamera(
      new Camera({
        fov: cameraParameters.fov,
        near: cameraParameters.near,
        far: cameraParameters.far,
        width,
        height,
        pixelRatio: this.pixelRatio,
        onMatricesChanged: () => {
          this.onCameraMatricesChanged();
        }
      })
    );
  }
  /**
   * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link cameraBufferBinding} inputs view values and the {@link meshes} {@link Camera} object.
   * @param camera - new {@link Camera} to use.
   */
  useCamera(camera) {
    if (this.camera && camera && this.camera.uuid === camera.uuid)
      return;
    if (this.camera) {
      this.camera.parent = null;
      this.camera.onMatricesChanged = () => {
      };
    }
    this.camera = camera;
    this.camera.parent = this.scene;
    if (this.cameraBinding) {
      this.camera.onMatricesChanged = () => this.onCameraMatricesChanged();
      this.cameraBinding.inputs.view.value = this.camera.viewMatrix;
      this.cameraBinding.inputs.projection.value = this.camera.projectionMatrix;
      for (const mesh of this.meshes) {
        if ("modelViewMatrix" in mesh) {
          mesh.camera = this.camera;
        }
      }
    }
  }
  /**
   * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings();
    for (const mesh of this.meshes) {
      if ("modelViewMatrix" in mesh) {
        mesh.shouldUpdateMatrixStack();
      }
    }
  }
  /**
   * Set the {@link cameraBufferBinding | camera buffer binding} and {@link cameraBindGroup | camera bind group}
   */
  setCameraBindGroupAndBinding() {
    this.cameraBinding = new BufferBinding({
      label: "Camera",
      name: "camera",
      visibility: ["vertex"],
      struct: {
        view: {
          // camera view matrix
          type: "mat4x4f",
          value: this.camera.viewMatrix
        },
        projection: {
          // camera projection matrix
          type: "mat4x4f",
          value: this.camera.projectionMatrix
        },
        position: {
          // camera world position
          type: "vec3f",
          value: this.camera.position.clone().setFromMatrixPosition(this.camera.worldMatrix),
          onBeforeUpdate: () => {
            this.cameraBinding.inputs.position.value.copy(this.camera.position).setFromMatrixPosition(this.camera.worldMatrix);
          }
        }
      }
    });
    this.cameraBindGroup = new BindGroup(this, {
      label: "Camera Uniform bind group",
      bindings: [this.cameraBinding]
    });
    this.cameraBindGroup.consumers.add(this.uuid);
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
   * Tell our {@link cameraBufferBinding | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
   */
  updateCameraBindings() {
    this.cameraBinding?.shouldUpdateBinding("view");
    this.cameraBinding?.shouldUpdateBinding("projection");
    this.cameraBinding?.shouldUpdateBinding("position");
    this.cameraBindGroup?.update();
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
   * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox = null) {
    this.setSize(rectBBox);
    this.setPerspective();
    this._onResizeCallback && this._onResizeCallback();
    this.resizeObjects();
    this._onAfterResizeCallback && this._onAfterResizeCallback();
  }
  /* RENDER */
  /**
   * {@link setCameraBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder) {
    if (!this.ready)
      return;
    this.setCameraBindGroup();
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
