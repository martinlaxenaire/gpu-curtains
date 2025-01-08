import { GPURenderer } from './GPURenderer.mjs';
import { Camera } from '../camera/Camera.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { BindGroup } from '../bindGroups/BindGroup.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { directionalShadowStruct } from '../shadows/DirectionalShadow.mjs';
import { pointShadowStruct } from '../shadows/PointShadow.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var _shouldUpdateCameraLightsBindGroup;
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
    context = {},
    renderPass,
    camera = {},
    lights = {}
  }) {
    super({
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      context,
      renderPass
    });
    /** @ignore */
    __privateAdd(this, _shouldUpdateCameraLightsBindGroup, void 0);
    this.type = "GPUCameraRenderer";
    camera = { ...{ fov: 50, near: 0.1, far: 1e3 }, ...camera };
    if (lights !== false) {
      lights = { ...{ maxAmbientLights: 2, maxDirectionalLights: 5, maxPointLights: 5 }, ...lights };
    }
    this.options = {
      ...this.options,
      camera,
      lights
    };
    this.bindings = {};
    __privateSet(this, _shouldUpdateCameraLightsBindGroup, true);
    this.lights = [];
    this.setCamera(camera);
    this.setCameraBinding();
    if (this.options.lights) {
      this.setLightsBinding();
      this.setShadowsBinding();
    }
    this.setCameraLightsBindGroup();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
   * Reset all our samplers, force all our scene objects and camera bind group to lose context.
   */
  loseContext() {
    super.loseContext();
    this.cameraLightsBindGroup.loseContext();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
   */
  restoreContext() {
    super.restoreContext();
    this.cameraLightsBindGroup?.restoreContext();
    this.updateCameraBindings();
  }
  /* CAMERA */
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
   * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link GPUCameraRenderer#bindings.camera | camera binding} inputs view values and the {@link meshes} {@link Camera} object.
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
    if (this.bindings.camera) {
      this.camera.onMatricesChanged = () => this.onCameraMatricesChanged();
      this.bindings.camera.inputs.view.value = this.camera.viewMatrix;
      this.bindings.camera.inputs.projection.value = this.camera.projectionMatrix;
      for (const mesh of this.meshes) {
        if ("modelViewMatrix" in mesh) {
          mesh.camera = this.camera;
        }
      }
    }
  }
  /**
   * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
   */
  onCameraMatricesChanged() {
    this.updateCameraBindings();
    for (const mesh of this.meshes) {
      if ("modelViewMatrix" in mesh) {
        mesh.shouldUpdateProjectionMatrixStack();
      }
    }
  }
  /**
   * Set the {@link GPUCameraRenderer#bindings.camera | camera buffer binding} and {@link cameraLightsBindGroup | camera bind group}
   */
  setCameraBinding() {
    this.bindings.camera = new BufferBinding({
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
            this.bindings.camera.inputs.position.value.copy(this.camera.position).setFromMatrixPosition(this.camera.worldMatrix);
          }
        }
      }
    });
  }
  /* LIGHTS */
  /**
   * Add a {@link Light} to the {@link lights} array.
   * @param light - {@link Light} to add.
   */
  addLight(light) {
    this.lights.push(light);
    this.bindings[light.type].inputs.count.value++;
    this.bindings[light.type].inputs.count.shouldUpdate = true;
  }
  /**
   * Remove a {@link Light} from the {@link lights} array.
   * @param light - {@link Light} to remove.
   */
  removeLight(light) {
    this.lights = this.lights.filter((l) => l.uuid !== light.uuid);
    this.bindings[light.type].inputs.count.value--;
    this.bindings[light.type].inputs.count.shouldUpdate = true;
  }
  /**
   * Set the lights {@link BufferBinding} based on the {@link lightsBindingParams}.
   */
  setLightsBinding() {
    if (!this.options.lights)
      return;
    this.lightsBindingParams = {
      ambientLights: {
        max: this.options.lights.maxAmbientLights,
        label: "Ambient lights",
        params: {
          color: {
            type: "array<vec3f>",
            size: 3
          }
        }
      },
      directionalLights: {
        max: this.options.lights.maxDirectionalLights,
        label: "Directional lights",
        params: {
          color: {
            type: "array<vec3f>",
            size: 3
          },
          direction: {
            type: "array<vec3f>",
            size: 3
          }
        }
      },
      pointLights: {
        max: this.options.lights.maxPointLights,
        label: "Point lights",
        params: {
          color: {
            type: "array<vec3f>",
            size: 3
          },
          position: {
            type: "array<vec3f>",
            size: 3
          },
          range: {
            type: "array<f32>",
            size: 1
          }
        }
      }
    };
    const lightsBindings = {
      ambientLights: null,
      directionalLights: null,
      pointLights: null
    };
    Object.keys(lightsBindings).forEach((lightsType) => {
      this.setLightsTypeBinding(lightsType);
    });
  }
  /**
   * Set or reset the {@link BufferBinding} for a given {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} for which to create the {@link BufferBinding}.
   */
  setLightsTypeBinding(lightsType) {
    const structParams = Object.keys(this.lightsBindingParams[lightsType].params).map((paramKey) => {
      return {
        key: paramKey,
        type: this.lightsBindingParams[lightsType].params[paramKey].type,
        size: this.lightsBindingParams[lightsType].params[paramKey].size
      };
    }).reduce((acc, binding) => {
      acc[binding.key] = {
        type: binding.type,
        value: new Float32Array(Math.max(this.lightsBindingParams[lightsType].max, 1) * binding.size)
      };
      return acc;
    }, {});
    this.bindings[lightsType] = new BufferBinding({
      label: this.lightsBindingParams[lightsType].label,
      name: lightsType,
      bindingType: "storage",
      visibility: ["vertex", "fragment", "compute"],
      // TODO needed in compute?
      struct: {
        count: {
          type: "i32",
          value: 0
        },
        ...structParams
      }
    });
  }
  /**
   * Called when a {@link LightsType | type of light} has overflown its maximum capacity. Destroys the associated {@link BufferBinding} (and eventually the associated shadow {@link BufferBinding}), recreates the {@link cameraLightsBindGroup | camera, lights and shadows bind group} and reset all lights for this {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} that has overflown its maximum capacity.
   */
  onMaxLightOverflow(lightsType) {
    if (!this.production) {
      throwWarning(
        `${this.options.label} (${this.type}): You are overflowing the current max lights count of '${this.lightsBindingParams[lightsType].max}' for this type of lights: ${lightsType}. This should be avoided by setting a larger ${"max" + lightsType.charAt(0).toUpperCase() + lightsType.slice(1)} when instancing your ${this.type}.`
      );
    }
    this.lightsBindingParams[lightsType].max++;
    const oldLightBinding = this.cameraLightsBindGroup.getBindingByName(lightsType);
    if (oldLightBinding) {
      this.cameraLightsBindGroup.destroyBufferBinding(oldLightBinding);
    }
    this.setLightsTypeBinding(lightsType);
    const lightBindingIndex = this.cameraLightsBindGroup.bindings.findIndex((binding) => binding.name === lightsType);
    if (lightBindingIndex !== -1) {
      this.cameraLightsBindGroup.bindings[lightBindingIndex] = this.bindings[lightsType];
    } else {
      this.bindings[lightsType].shouldResetBindGroup = true;
      this.bindings[lightsType].shouldResetBindGroupLayout = true;
      this.cameraLightsBindGroup.addBinding(this.bindings[lightsType]);
      this.shouldUpdateCameraLightsBindGroup();
    }
    if (lightsType === "directionalLights" || lightsType === "pointLights") {
      const shadowsType = lightsType.replace("Lights", "") + "Shadows";
      const oldShadowsBinding = this.cameraLightsBindGroup.getBindingByName(shadowsType);
      if (oldShadowsBinding) {
        this.cameraLightsBindGroup.destroyBufferBinding(oldShadowsBinding);
      }
      this.setShadowsTypeBinding(lightsType);
      const shadowsBindingIndex = this.cameraLightsBindGroup.bindings.findIndex(
        (binding) => binding.name === shadowsType
      );
      if (shadowsBindingIndex !== -1) {
        this.cameraLightsBindGroup.bindings[shadowsBindingIndex] = this.bindings[shadowsType];
      } else {
        this.bindings[shadowsType].shouldResetBindGroup = true;
        this.bindings[shadowsType].shouldResetBindGroupLayout = true;
        this.cameraLightsBindGroup.addBinding(this.bindings[shadowsType]);
        this.shouldUpdateCameraLightsBindGroup();
      }
    }
    this.cameraLightsBindGroup.resetEntries();
    this.cameraLightsBindGroup.createBindGroup();
    this.lights.forEach((light) => {
      if (light.type === lightsType) {
        light.reset();
      }
    });
  }
  /* SHADOW MAPS */
  /**
   * Get all the current {@link ShadowCastingLights | lights that can cast shadows}.
   * @returns - All {@link ShadowCastingLights | lights that can cast shadows}.
   */
  get shadowCastingLights() {
    return this.lights.filter(
      (light) => light.type === "directionalLights" || light.type === "pointLights"
    );
  }
  /**
   * Set the shadows {@link BufferBinding} based on the {@link shadowsBindingsStruct}.
   */
  setShadowsBinding() {
    this.shadowsBindingsStruct = {
      directional: directionalShadowStruct,
      point: pointShadowStruct
    };
    this.setShadowsTypeBinding("directionalLights");
    this.setShadowsTypeBinding("pointLights");
  }
  /**
   * Set or reset the associated shadow {@link BufferBinding} for a given {@link LightsType | type of light}.
   * @param lightsType - {@link LightsType | Type of light} for which to create the associated shadow {@link BufferBinding}.
   */
  setShadowsTypeBinding(lightsType) {
    const type = lightsType.replace("Lights", "");
    const shadowsType = type + "Shadows";
    const struct = this.shadowsBindingsStruct[type];
    const label = type.charAt(0).toUpperCase() + type.slice(1) + " shadows";
    this.bindings[shadowsType] = new BufferBinding({
      label,
      name: shadowsType,
      bindingType: "storage",
      visibility: ["vertex", "fragment", "compute"],
      // TODO needed in compute?
      childrenBindings: [
        {
          binding: new BufferBinding({
            label: label + " element",
            name: shadowsType + "Elements",
            bindingType: "uniform",
            visibility: ["vertex", "fragment"],
            struct
          }),
          count: Math.max(1, this.lightsBindingParams[lightsType].max),
          forceArray: true
          // needs to be iterable anyway!
        }
      ]
    });
  }
  /* CAMERA, LIGHTS & SHADOWS BIND GROUP */
  /**
   * Set the {@link cameraLightsBindGroup | camera, lights and shadows bind group}.
   */
  setCameraLightsBindGroup() {
    this.cameraLightsBindGroup = new BindGroup(this, {
      label: this.options.label + ": Camera and lights uniform bind group",
      bindings: Object.keys(this.bindings).map((bindingName) => this.bindings[bindingName]).flat()
    });
    this.cameraLightsBindGroup.consumers.add(this.uuid);
  }
  /**
   * Create the {@link cameraLightsBindGroup | camera, lights and shadows bind group} buffers
   */
  setCameraBindGroup() {
    if (this.cameraLightsBindGroup && this.cameraLightsBindGroup.shouldCreateBindGroup) {
      this.cameraLightsBindGroup.setIndex(0);
      this.cameraLightsBindGroup.createBindGroup();
    }
  }
  /**
   * Tell our  {@link cameraLightsBindGroup | camera, lights and shadows bind group} to update.
   */
  shouldUpdateCameraLightsBindGroup() {
    __privateSet(this, _shouldUpdateCameraLightsBindGroup, true);
  }
  /**
   * Tell our {@link GPUCameraRenderer#bindings.camera | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
   */
  updateCameraBindings() {
    this.bindings.camera?.shouldUpdateBinding("view");
    this.bindings.camera?.shouldUpdateBinding("projection");
    this.bindings.camera?.shouldUpdateBinding("position");
    this.shouldUpdateCameraLightsBindGroup();
  }
  /**
   * Update the {@link cameraLightsBindGroup | camera and lights BindGroup}.
   */
  updateCameraLightsBindGroup() {
    if (this.cameraLightsBindGroup && __privateGet(this, _shouldUpdateCameraLightsBindGroup)) {
      this.cameraLightsBindGroup.update();
      __privateSet(this, _shouldUpdateCameraLightsBindGroup, false);
    }
  }
  /**
   * Get all objects ({@link core/renderers/GPURenderer.RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to check
   */
  getObjectsByBindGroup(bindGroup) {
    return this.deviceRenderedObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups,
        this.cameraLightsBindGroup
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
    this.updateCameraLightsBindGroup();
    super.render(commandEncoder);
    if (this.cameraLightsBindGroup) {
      this.cameraLightsBindGroup.needsPipelineFlush = false;
    }
  }
  /**
   * Destroy our {@link GPUCameraRenderer}
   */
  destroy() {
    this.cameraLightsBindGroup?.destroy();
    this.lights.forEach((light) => light.remove());
    super.destroy();
  }
}
_shouldUpdateCameraLightsBindGroup = new WeakMap();

export { GPUCameraRenderer };
