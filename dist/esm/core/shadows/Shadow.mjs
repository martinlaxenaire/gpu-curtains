import { isCameraRenderer } from '../renderers/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Texture } from '../textures/Texture.mjs';
import { RenderTarget } from '../renderPasses/RenderTarget.mjs';
import { Sampler } from '../samplers/Sampler.mjs';
import { RenderMaterial } from '../materials/RenderMaterial.mjs';
import { getDefaultShadowDepthVs } from '../shaders/chunks/utils/shadows.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _intensity, _bias, _normalBias, _pcfSamples, _isActive, _materials, _depthMaterials, _depthPassTaskID, _setParameters, setParameters_fn;
const shadowStruct = {
  isActive: {
    type: "i32",
    value: 0
  },
  pcfSamples: {
    type: "i32",
    value: 0
  },
  bias: {
    type: "f32",
    value: 0
  },
  normalBias: {
    type: "f32",
    value: 0
  },
  intensity: {
    type: "f32",
    value: 0
  }
};
class Shadow {
  /**
   * Shadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Shadow}.
   * @param parameters - {@link ShadowBaseParams | parameters} used to create this {@link Shadow}.
   */
  constructor(renderer, {
    light,
    intensity = 1,
    bias = 0,
    normalBias = 0,
    pcfSamples = 1,
    depthTextureSize = new Vec2(512),
    depthTextureFormat = "depth24plus"
  } = {}) {
    /**
     * Set the {@link Shadow} parameters.
     * @param parameters - parameters to use for this {@link Shadow}.
     * @private
     */
    __privateAdd(this, _setParameters);
    /** @ignore */
    __privateAdd(this, _intensity, void 0);
    /** @ignore */
    __privateAdd(this, _bias, void 0);
    /** @ignore */
    __privateAdd(this, _normalBias, void 0);
    /** @ignore */
    __privateAdd(this, _pcfSamples, void 0);
    /** @ignore */
    __privateAdd(this, _isActive, void 0);
    /**
     * Original {@link meshes} {@link RenderMaterial | materials}.
     * @private
     */
    __privateAdd(this, _materials, void 0);
    /**
     * Corresponding depth {@link meshes} {@link RenderMaterial | materials}.
     * @private
     */
    __privateAdd(this, _depthMaterials, void 0);
    /** @ignore */
    __privateAdd(this, _depthPassTaskID, void 0);
    renderer = isCameraRenderer(renderer, this.constructor.name);
    this.renderer = renderer;
    this.rendererBinding = null;
    this.light = light;
    this.index = this.light.index;
    this.options = {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat
    };
    this.sampleCount = 1;
    this.meshes = /* @__PURE__ */ new Map();
    __privateSet(this, _materials, /* @__PURE__ */ new Map());
    __privateSet(this, _depthMaterials, /* @__PURE__ */ new Map());
    __privateSet(this, _depthPassTaskID, null);
    __privateMethod(this, _setParameters, setParameters_fn).call(this, { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat });
    this.isActive = false;
  }
  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link Shadow}.
   */
  cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat } = {}) {
    this.isActive = true;
    __privateMethod(this, _setParameters, setParameters_fn).call(this, { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat });
  }
  /** @ignore */
  setRendererBinding() {
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed.
   */
  reset() {
    if (this.isActive) {
      this.updateShadowProperty("isActive", 1);
      this.updateShadowProperty("intensity", this.intensity);
      this.updateShadowProperty("bias", this.bias);
      this.updateShadowProperty("normalBias", this.normalBias);
      this.updateShadowProperty("pcfSamples", this.pcfSamples);
    }
  }
  /**
   * Get whether this {@link Shadow} is actually casting shadows.
   * @returns - Whether this {@link Shadow} is actually casting shadows.
   */
  get isActive() {
    return __privateGet(this, _isActive);
  }
  /**
   * Start or stop casting shadows.
   * @param value
   */
  set isActive(value) {
    if (!value && this.isActive) {
      this.destroy();
    } else if (value && !this.isActive) {
      this.init();
    }
    __privateSet(this, _isActive, value);
  }
  /**
   * Get this {@link Shadow} intensity.
   * @returns - The {@link Shadow} intensity.
   */
  get intensity() {
    return __privateGet(this, _intensity);
  }
  /**
   * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link BufferBinding}.
   * @param value - The new {@link Shadow} intensity.
   */
  set intensity(value) {
    __privateSet(this, _intensity, value);
    if (this.isActive)
      this.updateShadowProperty("intensity", this.intensity);
  }
  /**
   * Get this {@link Shadow} bias.
   * @returns - The {@link Shadow} bias.
   */
  get bias() {
    return __privateGet(this, _bias);
  }
  /**
   * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} bias.
   */
  set bias(value) {
    __privateSet(this, _bias, value);
    if (this.isActive)
      this.updateShadowProperty("bias", this.bias);
  }
  /**
   * Get this {@link Shadow} normal bias.
   * @returns - The {@link Shadow} normal bias.
   */
  get normalBias() {
    return __privateGet(this, _normalBias);
  }
  /**
   * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} normal bias.
   */
  set normalBias(value) {
    __privateSet(this, _normalBias, value);
    if (this.isActive)
      this.updateShadowProperty("normalBias", this.normalBias);
  }
  /**
   * Get this {@link Shadow} PCF samples count.
   * @returns - The {@link Shadow} PCF samples count.
   */
  get pcfSamples() {
    return __privateGet(this, _pcfSamples);
  }
  /**
   * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link BufferBinding}..
   * @param value - The new {@link Shadow} PCF samples count.
   */
  set pcfSamples(value) {
    __privateSet(this, _pcfSamples, Math.max(1, Math.ceil(value)));
    if (this.isActive)
      this.updateShadowProperty("pcfSamples", this.pcfSamples);
  }
  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget} and start rendering to the shadow map.
   */
  init() {
    if (!this.depthComparisonSampler) {
      const samplerExists = this.renderer.samplers.find((sampler) => sampler.name === "depthComparisonSampler");
      this.depthComparisonSampler = samplerExists || new Sampler(this.renderer, {
        label: "Depth comparison sampler",
        name: "depthComparisonSampler",
        // we do not want to repeat the shadows
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        compare: "less",
        minFilter: "linear",
        magFilter: "linear",
        type: "comparison"
      });
    }
    this.setDepthTexture();
    if (!this.depthPassTarget) {
      this.createDepthPassTarget();
    }
    if (__privateGet(this, _depthPassTaskID) === null) {
      this.setDepthPass();
    }
    this.updateShadowProperty("isActive", 1);
  }
  /**
   * Reset the {@link depthTexture} when the {@link depthTextureSize} changes.
   */
  onDepthTextureSizeChanged() {
    this.setDepthTexture();
  }
  /**
   * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
   */
  setDepthTexture() {
    if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) {
      this.depthTexture.options.fixedSize.width = this.depthTextureSize.x;
      this.depthTexture.options.fixedSize.height = this.depthTextureSize.y;
      this.depthTexture.size.width = this.depthTextureSize.x;
      this.depthTexture.size.height = this.depthTextureSize.y;
      this.depthTexture.createTexture();
      if (this.depthPassTarget) {
        this.depthPassTarget.resize();
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture();
    }
  }
  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: "Shadow depth texture " + this.index,
      name: "shadowDepthTexture" + this.index,
      type: "depth",
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y
      }
    });
  }
  /**
   * Create the {@link depthPassTarget}.
   */
  createDepthPassTarget() {
    this.depthPassTarget = new RenderTarget(this.renderer, {
      label: "Depth pass render target for " + this.constructor.name + " " + this.index,
      useColorAttachments: false,
      depthTexture: this.depthTexture,
      sampleCount: this.sampleCount
    });
  }
  /**
   * Update the {@link CameraRenderer} corresponding {@link BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  updateShadowProperty(propertyKey, value) {
    if (this.rendererBinding) {
      if (value instanceof Mat4) {
        for (let i = 0; i < value.elements.length; i++) {
          this.rendererBinding.bindings[this.index].inputs[propertyKey].value[i] = value.elements[i];
        }
        this.rendererBinding.bindings[this.index].inputs[propertyKey].shouldUpdate = true;
      } else {
        this.rendererBinding.bindings[this.index].inputs[propertyKey].value = value;
      }
      this.renderer.shouldUpdateCameraLightsBindGroup();
    }
  }
  /**
   * Start the depth pass.
   */
  setDepthPass() {
    __privateSet(this, _depthPassTaskID, this.depthPassTask());
  }
  /**
   * Remove the depth pass from its {@link utils/TaskQueueManager.TaskQueueManager | task queue manager}.
   * @param depthPassTaskID - Task queue manager ID to use for removal.
   */
  removeDepthPass(depthPassTaskID) {
    this.renderer.onBeforeRenderScene.remove(depthPassTaskID);
  }
  /**
   * Render the depth pass. This happens before rendering the {@link CameraRenderer#scene | scene}.<br>
   * - Force all the {@link meshes} to use their depth materials
   * - Render all the {@link meshes}
   * - Reset all the {@link meshes} materials to their original one.
   */
  depthPassTask() {
    return this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        if (!this.meshes.size)
          return;
        this.useDepthMaterials();
        this.renderDepthPass(commandEncoder);
        this.useOriginalMaterials();
        this.renderer.pipelineManager.resetCurrentPipeline();
      },
      {
        order: this.index
      }
    );
  }
  /**
   * Render all the {@link meshes} into the {@link depthPassTarget}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  renderDepthPass(commandEncoder) {
    this.renderer.pipelineManager.resetCurrentPipeline();
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor);
    this.meshes.forEach((mesh) => {
      if (mesh.ready)
        mesh.render(depthPass);
    });
    depthPass.end();
  }
  /**
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs() {
    return getDefaultShadowDepthVs(this.index);
  }
  /**
   * Get the default depth pass fragment shader for this {@link Shadow}.
   * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
   */
  getDefaultShadowDepthFs() {
    return false;
  }
  /**
   * Patch the given {@link ProjectedMesh | mesh} material parameters to create the depth material.
   * @param mesh - original {@link ProjectedMesh | mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth material.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh, parameters = {}) {
    if (!parameters.shaders) {
      parameters.shaders = {
        vertex: {
          code: this.getDefaultShadowDepthVs()
        },
        fragment: this.getDefaultShadowDepthFs()
      };
    }
    parameters = { ...mesh.material.options.rendering, ...parameters };
    parameters.targets = [];
    parameters.sampleCount = this.sampleCount;
    parameters.depthFormat = this.depthTextureFormat;
    if (parameters.bindings) {
      parameters.bindings = [mesh.material.getBufferBindingByName("matrices"), ...parameters.bindings];
    } else {
      parameters.bindings = [mesh.material.getBufferBindingByName("matrices")];
    }
    return parameters;
  }
  /**
   * Add a {@link ProjectedMesh | mesh} to the shadow map. Internally called by the {@link ProjectedMesh | mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
   * - Save the original {@link ProjectedMesh | mesh} material.
   * - {@link patchShadowCastingMeshParams | Patch} the parameters.
   * - Create a new depth {@link RenderMaterial} with the patched parameters.
   * - Add the {@link ProjectedMesh | mesh} to the {@link meshes} Map.
   * @param mesh - {@link ProjectedMesh | mesh} to add to the shadow map.
   * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth material.
   */
  addShadowCastingMesh(mesh, parameters = {}) {
    mesh.options.castShadows = true;
    __privateGet(this, _materials).set(mesh.uuid, mesh.material);
    parameters = this.patchShadowCastingMeshParams(mesh, parameters);
    if (__privateGet(this, _depthMaterials).get(mesh.uuid)) {
      __privateGet(this, _depthMaterials).get(mesh.uuid).destroy();
      __privateGet(this, _depthMaterials).delete(mesh.uuid);
    }
    __privateGet(this, _depthMaterials).set(
      mesh.uuid,
      new RenderMaterial(this.renderer, {
        label: mesh.options.label + " depth render material",
        ...parameters
      })
    );
    this.meshes.set(mesh.uuid, mesh);
  }
  /**
   * Force all the {@link meshes} to use the depth material.
   */
  useDepthMaterials() {
    this.meshes.forEach((mesh) => {
      mesh.useMaterial(__privateGet(this, _depthMaterials).get(mesh.uuid));
    });
  }
  /**
   * Force all the {@link meshes} to use their original material.
   */
  useOriginalMaterials() {
    this.meshes.forEach((mesh) => {
      mesh.useMaterial(__privateGet(this, _materials).get(mesh.uuid));
    });
  }
  /**
   * Remove a {@link ProjectedMesh | mesh} from the shadow map and destroy its depth material.
   * @param mesh - {@link ProjectedMesh | mesh} to remove.
   */
  removeMesh(mesh) {
    const depthMaterial = __privateGet(this, _depthMaterials).get(mesh.uuid);
    if (depthMaterial) {
      depthMaterial.destroy();
      __privateGet(this, _depthMaterials).delete(mesh.uuid);
    }
    this.meshes.delete(mesh.uuid);
  }
  /**
   * Destroy the {@link Shadow}.
   */
  destroy() {
    this.updateShadowProperty("isActive", 0);
    if (__privateGet(this, _depthPassTaskID) !== null) {
      this.removeDepthPass(__privateGet(this, _depthPassTaskID));
      __privateSet(this, _depthPassTaskID, null);
    }
    this.meshes.forEach((mesh) => this.removeMesh(mesh));
    __privateSet(this, _materials, /* @__PURE__ */ new Map());
    __privateSet(this, _depthMaterials, /* @__PURE__ */ new Map());
    this.meshes = /* @__PURE__ */ new Map();
    this.depthPassTarget?.destroy();
    this.depthTexture?.destroy();
  }
}
_intensity = new WeakMap();
_bias = new WeakMap();
_normalBias = new WeakMap();
_pcfSamples = new WeakMap();
_isActive = new WeakMap();
_materials = new WeakMap();
_depthMaterials = new WeakMap();
_depthPassTaskID = new WeakMap();
_setParameters = new WeakSet();
setParameters_fn = function({
  intensity = 1,
  bias = 0,
  normalBias = 0,
  pcfSamples = 1,
  depthTextureSize = new Vec2(512),
  depthTextureFormat = "depth24plus"
} = {}) {
  this.intensity = intensity;
  this.bias = bias;
  this.normalBias = normalBias;
  this.pcfSamples = pcfSamples;
  this.depthTextureSize = depthTextureSize;
  this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged());
  this.depthTextureFormat = depthTextureFormat;
};

export { Shadow, shadowStruct };
