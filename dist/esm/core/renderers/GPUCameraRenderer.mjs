import { GPURenderer } from './GPURenderer.mjs';
import { PerspectiveCamera } from '../cameras/PerspectiveCamera.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { BindGroup } from '../bindGroups/BindGroup.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { directionalShadowStruct } from '../shadows/DirectionalShadow.mjs';
import { pointShadowStruct } from '../shadows/PointShadow.mjs';
import { spotShadowStruct } from '../shadows/SpotShadow.mjs';
import { Texture } from '../textures/Texture.mjs';
import { Sampler } from '../samplers/Sampler.mjs';
import { OrthographicCamera } from '../cameras/OrthographicCamera.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _shouldUpdateCameraLightsBindGroup, _GPUCameraRenderer_instances, initLights_fn, updateLightsCount_fn;
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
    __privateAdd(this, _GPUCameraRenderer_instances);
    /** @ignore */
    __privateAdd(this, _shouldUpdateCameraLightsBindGroup);
    this.type = "GPUCameraRenderer";
    camera = { ...{ fov: 50, near: 0.1, far: 1e3 }, ...camera };
    if (lights !== false) {
      lights = {
        ...{
          maxAmbientLights: 2,
          maxDirectionalLights: 5,
          maxPointLights: 5,
          maxSpotLights: 5,
          useUniformsForShadows: false
        },
        ...lights
      };
    }
    this.options = {
      ...this.options,
      camera,
      lights
    };
    this.bindings = {};
    __privateSet(this, _shouldUpdateCameraLightsBindGroup, true);
    this.lights = [];
    this.cameraViewport = null;
    this.setCamera(camera);
    this.setCameraBinding();
    if (this.options.lights) {
      __privateMethod(this, _GPUCameraRenderer_instances, initLights_fn).call(this);
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
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.loseContext());
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
   * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
   */
  restoreContext() {
    super.restoreContext();
    this.cameraLightsBindGroup?.restoreContext();
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.restoreContext());
    this.updateCameraBindings();
  }
  /**
   * Set our {@link renderPass | main render pass} and our {@link transmissionTarget} sampler.
   */
  setMainRenderPasses() {
    super.setMainRenderPasses();
    this.transmissionTarget = {
      sampler: new Sampler(this, {
        label: "Transmission sampler",
        name: "transmissionSampler",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge"
      })
    };
  }
  /* CAMERA */
  /**
   * Set the {@link camera}
   * @param cameraParameters - {@link PerspectiveCameraBaseOptions | parameters} used to create the {@link camera}
   */
  setCamera(cameraParameters) {
    const { width, height } = this.rectBBox;
    this.useCamera(
      new PerspectiveCamera({
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
    if (this.camera && camera && this.camera.uuid === camera.uuid) return;
    if (this.camera) {
      this.camera.parent = null;
      this.camera.onMatricesChanged = () => {
      };
    }
    this.camera = camera;
    this.camera.parent = this.scene;
    this.resizeCamera();
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
   * Update the {@link cameraViewport} if needed (i.e. if the camera use a different aspect ratio than the renderer).
   */
  updateCameraViewport() {
    let { width, height } = this.canvas;
    if (this.viewport) {
      width = Math.min(width, this.viewport.width);
      height = Math.min(height, this.viewport.height);
    }
    if (this.camera instanceof PerspectiveCamera && this.camera.forceAspect) {
      width = Math.min(width, height * this.camera.forceAspect);
      height = Math.min(width / this.camera.forceAspect, height);
      this.setCameraViewport({
        width,
        height,
        top: (this.canvas.height - height) * 0.5,
        left: (this.canvas.width - width) * 0.5,
        minDepth: 0,
        maxDepth: 1
      });
    } else {
      this.setCameraViewport();
    }
  }
  /**
   * Resize the {@link camera}, first by updating the {@link cameraViewport} and then resetting the {@link camera} projection.
   */
  resizeCamera() {
    this.updateCameraViewport();
    const { width, height } = this.cameraViewport ?? this.viewport ?? this.canvas;
    if (this.camera instanceof PerspectiveCamera) {
      this.camera?.setPerspective({
        width,
        height,
        pixelRatio: this.pixelRatio
      });
    } else if (this.camera instanceof OrthographicCamera) {
      const aspect = width / height;
      const frustumSize = this.camera.top * 2;
      this.camera.setOrthographic({
        left: -frustumSize * aspect / 2,
        right: frustumSize * aspect / 2,
        pixelRatio: this.pixelRatio
      });
    }
  }
  /**
   * Set the {@link cameraViewport} (that should be contained within the renderer {@link viewport} if any) and update the {@link renderPass} and {@link postProcessingPass} {@link viewport} values.
   * @param viewport - {@link RenderPassViewport} settings to use if any.
   */
  setCameraViewport(viewport = null) {
    this.cameraViewport = viewport;
    if (!this.cameraViewport) {
      this.renderPass?.setViewport(this.viewport);
      this.postProcessingPass?.setViewport(this.viewport);
    } else {
      if (this.viewport) {
        const aspect = this.cameraViewport.width / this.cameraViewport.height;
        this.cameraViewport.width = Math.min(this.viewport.width, this.viewport.height * aspect);
        this.cameraViewport.height = Math.min(this.cameraViewport.width / aspect, this.viewport.height);
        this.cameraViewport.left = Math.max(0, (this.viewport.width - this.cameraViewport.width) * 0.5);
        this.cameraViewport.top = Math.max(0, (this.viewport.height - this.cameraViewport.height) * 0.5);
      }
      this.renderPass?.setViewport(this.cameraViewport);
      this.postProcessingPass?.setViewport(this.cameraViewport);
    }
  }
  /**
   * Resize the {@link camera} whenever the {@link viewport} is updated.
   * @param viewport - {@link RenderPassViewport} settings to use if any. Can be set to `null` to cancel the {@link viewport}.
   */
  setViewport(viewport = null) {
    super.setViewport(viewport);
    this.resizeCamera();
  }
  /**
   * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes.
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
      visibility: ["vertex", "fragment"],
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
  /**
   * Add a {@link Light} to the {@link lights} array.
   * @param light - {@link Light} to add.
   */
  addLight(light) {
    this.lights.push(light);
    __privateMethod(this, _GPUCameraRenderer_instances, updateLightsCount_fn).call(this, light.type);
  }
  /**
   * Remove a {@link Light} from the {@link lights} array.
   * @param light - {@link Light} to remove.
   */
  removeLight(light) {
    this.lights = this.lights.filter((l) => l.uuid !== light.uuid);
    __privateMethod(this, _GPUCameraRenderer_instances, updateLightsCount_fn).call(this, light.type);
  }
  /**
   * Set the lights {@link BufferBinding} based on the {@link lightsBindingParams}.
   */
  setLightsBinding() {
    if (!this.options.lights) return;
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
      },
      spotLights: {
        max: this.options.lights.maxSpotLights,
        label: "Spot lights",
        params: {
          color: {
            type: "array<vec3f>",
            size: 3
          },
          direction: {
            type: "array<vec3f>",
            size: 3
          },
          position: {
            type: "array<vec3f>",
            size: 3
          },
          coneCos: {
            type: "array<f32>",
            size: 1
          },
          penumbraCos: {
            type: "array<f32>",
            size: 1
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
      pointLights: null,
      spotLights: null
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
      visibility: ["fragment", "compute"],
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
   * @param lightIndex - The {@link Light#index | light index} that caused overflow. Will be used to reset the new max light count.
   */
  onMaxLightOverflow(lightsType, lightIndex = 0) {
    if (!this.options.lights) {
      if (!this.production) {
        throwWarning(
          `${this.options.label} (${this.type}): You are adding a light (${lightsType}) to a renderer that should not initially handle lights. The renderer bind group will be re-created. This should be avoided.`
        );
      }
      __privateMethod(this, _GPUCameraRenderer_instances, initLights_fn).call(this);
      this.cameraLightsBindGroup.destroy();
      this.setCameraLightsBindGroup();
    } else {
      if (!this.production) {
        throwWarning(
          `${this.options.label} (${this.type}): You are overflowing the current max lights count of '${this.lightsBindingParams[lightsType].max}' for this type of lights: ${lightsType}. This should be avoided by setting a larger ${"max" + lightsType.charAt(0).toUpperCase() + lightsType.slice(1)} when instancing your ${this.type}.`
        );
      }
      this.lightsBindingParams[lightsType].max = Math.max(this.lightsBindingParams[lightsType].max, lightIndex + 1);
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
      if (lightsType === "directionalLights" || lightsType === "pointLights" || lightsType === "spotLights") {
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
  }
  /* SHADOW MAPS */
  /**
   * Get all the current {@link ShadowCastingLights | lights that can cast shadows}.
   * @returns - All {@link ShadowCastingLights | lights that can cast shadows}.
   */
  get shadowCastingLights() {
    return this.lights.filter(
      (light) => light.type === "directionalLights" || light.type === "pointLights" || light.type === "spotLights"
    );
  }
  /**
   * Set the shadows {@link BufferBinding} based on the {@link shadowsBindingsStruct}.
   */
  setShadowsBinding() {
    this.shadowsBindingsStruct = {
      directional: directionalShadowStruct,
      point: pointShadowStruct,
      spot: spotShadowStruct
    };
    this.setShadowsTypeBinding("directionalLights");
    this.setShadowsTypeBinding("pointLights");
    this.setShadowsTypeBinding("spotLights");
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
      bindingType: this.options.lights && this.options.lights.useUniformsForShadows ? "uniform" : "storage",
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
    this.pointShadowsCubeFaceBindGroups = [];
    for (let face = 0; face < 6; face++) {
      const cubeFace = new BufferBinding({
        label: "Cube face",
        name: "cubeFace",
        bindingType: "uniform",
        visibility: ["vertex"],
        struct: {
          face: {
            type: "u32",
            value: face
          }
        }
      });
      const cubeBindGroup = new BindGroup(this, {
        label: `Cube face bind group ${face}`,
        bindings: [cubeFace]
      });
      cubeBindGroup.createBindGroup();
      cubeBindGroup.consumers.add(this.uuid);
      this.pointShadowsCubeFaceBindGroups.push(cubeBindGroup);
    }
    if (this.device) {
      this.createCameraLightsBindGroup();
    }
  }
  /**
   * Create the {@link cameraLightsBindGroup | camera, lights and shadows bind group} buffers
   */
  createCameraLightsBindGroup() {
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
   * Set our {@link camera} {@link Camera#position | position}
   * @param position - new {@link Camera#position | position}
   */
  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.camera.position.copy(position);
  }
  /* TRANSMISSIVE */
  /**
   * Create the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if not already created.
   */
  createTransmissionTarget() {
    if (!this.transmissionTarget.texture) {
      this.transmissionTarget.passEntry = this.scene.createScreenPassEntry("Transmission scene screen render pass");
      this.transmissionTarget.texture = new Texture(this, {
        label: "Transmission background scene render target output",
        name: "transmissionBackgroundTexture",
        generateMips: true,
        // needed for roughness LOD!
        format: this.options.context.format,
        autoDestroy: false
      });
      this.transmissionTarget.passEntry.onBeforeRenderPass = (commandEncoder, swapChainTexture) => {
        this.copyGPUTextureToTexture(swapChainTexture, this.transmissionTarget.texture, commandEncoder);
      };
    }
  }
  /**
   * Destroy the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if already created.
   */
  destroyTransmissionTarget() {
    if (this.transmissionTarget.texture) {
      this.transmissionTarget.texture.destroy();
      this.scene.renderPassEntries.screen = this.scene.renderPassEntries.screen.filter(
        (passEntry) => passEntry.label !== "Transmission scene screen render pass"
      );
      this.transmissionTarget.texture = null;
      this.transmissionTarget.passEntry = null;
    }
  }
  /**
   * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox = null) {
    this.setSize(rectBBox);
    this._onResizeCallback && this._onResizeCallback();
    this.resizeCamera();
    this.resizeObjects();
    this._onAfterResizeCallback && this._onAfterResizeCallback();
  }
  /* RENDER */
  /**
   * {@link createCameraLightsBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}.
   * @param commandEncoder - Current {@link GPUCommandEncoder}.
   */
  render(commandEncoder) {
    if (!this.ready) return;
    this.createCameraLightsBindGroup();
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
    this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.destroy());
    this.destroyTransmissionTarget();
    this.lights.forEach((light) => light.destroy());
    super.destroy();
    this.lights.forEach((light) => this.removeLight(light));
  }
}
_shouldUpdateCameraLightsBindGroup = new WeakMap();
_GPUCameraRenderer_instances = new WeakSet();
/* LIGHTS */
/**
 * Initialize the lights and shadows bindings.
 * @private
 */
initLights_fn = function() {
  if (!this.options.lights) {
    this.options.lights = {
      maxAmbientLights: 2,
      maxDirectionalLights: 5,
      maxPointLights: 5,
      maxSpotLights: 5,
      useUniformsForShadows: false
    };
  }
  this.setLightsBinding();
  this.setShadowsBinding();
};
/**
 * Update the lights count for the given {@link LightsType} based on the max light index.
 * @param lightsType - {@link LightsType} for which to update the light count.
 * @private
 */
updateLightsCount_fn = function(lightsType) {
  let maxIndex = 0;
  this.lights.filter((light) => light.type === lightsType).forEach((light) => {
    maxIndex = Math.max(maxIndex, light.index + 1);
  });
  this.bindings[lightsType].inputs.count.value = maxIndex;
  this.bindings[lightsType].inputs.count.shouldUpdate = true;
};

export { GPUCameraRenderer };
