import { isCameraRenderer } from '../renderers/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Texture } from '../textures/Texture.mjs';
import { RenderTarget } from '../renderPasses/RenderTarget.mjs';
import { Sampler } from '../samplers/Sampler.mjs';
import { getDefaultShadowDepthVs } from '../shaders/full/vertex/get-default-shadow-depth-vertex-shader-code.mjs';
import { Mesh } from '../meshes/Mesh.mjs';

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
  member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _intensity, _bias, _normalBias, _pcfSamples, _isActive, _autoRender, _depthPassTaskID, _setParameters, setParameters_fn;
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
    depthTextureFormat = "depth24plus",
    autoRender = true
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
    /** @ignore */
    __privateAdd(this, _autoRender, void 0);
    /** @ignore */
    __privateAdd(this, _depthPassTaskID, void 0);
    this.setRenderer(renderer);
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
    this.depthMeshes = /* @__PURE__ */ new Map();
    __privateSet(this, _depthPassTaskID, null);
    __privateMethod(this, _setParameters, setParameters_fn).call(this, { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender });
    this.isActive = false;
  }
  /**
   * Set or reset this shadow {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    renderer = isCameraRenderer(renderer, this.constructor.name);
    this.renderer = renderer;
    this.setRendererBinding();
    this.depthMeshes?.forEach((depthMesh) => {
      depthMesh.setRenderer(this.renderer);
    });
  }
  /** @ignore */
  setRendererBinding() {
    this.rendererBinding = null;
  }
  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link Shadow}.
   */
  cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender } = {}) {
    __privateMethod(this, _setParameters, setParameters_fn).call(this, { intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender });
    this.isActive = true;
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed.
   */
  reset() {
    this.onPropertyChanged("isActive", this.isActive ? 1 : 0);
    this.onPropertyChanged("intensity", this.intensity);
    this.onPropertyChanged("bias", this.bias);
    this.onPropertyChanged("normalBias", this.normalBias);
    this.onPropertyChanged("pcfSamples", this.pcfSamples);
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
   * @param value - New active state.
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
   * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} intensity.
   */
  set intensity(value) {
    __privateSet(this, _intensity, value);
    this.onPropertyChanged("intensity", this.intensity);
  }
  /**
   * Get this {@link Shadow} bias.
   * @returns - The {@link Shadow} bias.
   */
  get bias() {
    return __privateGet(this, _bias);
  }
  /**
   * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} bias.
   */
  set bias(value) {
    __privateSet(this, _bias, value);
    this.onPropertyChanged("bias", this.bias);
  }
  /**
   * Get this {@link Shadow} normal bias.
   * @returns - The {@link Shadow} normal bias.
   */
  get normalBias() {
    return __privateGet(this, _normalBias);
  }
  /**
   * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} normal bias.
   */
  set normalBias(value) {
    __privateSet(this, _normalBias, value);
    this.onPropertyChanged("normalBias", this.normalBias);
  }
  /**
   * Get this {@link Shadow} PCF samples count.
   * @returns - The {@link Shadow} PCF samples count.
   */
  get pcfSamples() {
    return __privateGet(this, _pcfSamples);
  }
  /**
   * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Shadow} PCF samples count.
   */
  set pcfSamples(value) {
    __privateSet(this, _pcfSamples, Math.max(1, Math.ceil(value)));
    this.onPropertyChanged("pcfSamples", this.pcfSamples);
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
    if (__privateGet(this, _depthPassTaskID) === null && __privateGet(this, _autoRender)) {
      this.setDepthPass();
      this.onPropertyChanged("isActive", 1);
    }
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
      label: `${this.constructor.name} (index: ${this.light.index}) depth texture`,
      name: "shadowDepthTexture" + this.index,
      type: "depth",
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y
      },
      autoDestroy: false
      // do not destroy when removing a mesh
    });
  }
  /**
   * Clear the content of the depth texture. Called whenever the {@link meshes} array is empty after having removed a mesh.
   */
  clearDepthTexture() {
    if (!this.depthTexture || !this.depthTexture.texture)
      return;
    const commandEncoder = this.renderer.device.createCommandEncoder();
    !this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
    const renderPassDescriptor = {
      colorAttachments: [],
      depthStencilAttachment: {
        view: this.depthTexture.texture.createView({
          label: "Clear " + this.depthTexture.texture.label + " view"
        }),
        depthLoadOp: "clear",
        // Clear the depth attachment
        depthClearValue: 1,
        // Clear to the maximum depth (farthest possible depth)
        depthStoreOp: "store"
        // Store the cleared depth
      }
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.end();
    !this.renderer.production && commandEncoder.popDebugGroup();
    this.renderer.device.queue.submit([commandEncoder.finish()]);
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
   * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  onPropertyChanged(propertyKey, value) {
    if (this.rendererBinding) {
      if (value instanceof Mat4) {
        for (let i = 0; i < value.elements.length; i++) {
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value[i] = value.elements[i];
        }
        this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true;
      } else {
        this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value = value;
      }
      this.renderer.shouldUpdateCameraLightsBindGroup();
    }
  }
  /**
   * Start the depth pass.
   */
  setDepthPass() {
    __privateSet(this, _depthPassTaskID, this.render());
  }
  /**
   * Remove the depth pass from its {@link utils/TasksQueueManager.TasksQueueManager | task queue manager}.
   * @param depthPassTaskID - Task queue manager ID to use for removal.
   */
  removeDepthPass(depthPassTaskID) {
    this.renderer.onBeforeRenderScene.remove(depthPassTaskID);
  }
  /**
   * Render the depth pass. This happens before rendering the {@link CameraRenderer#scene | scene}.<br>
   * - Render all the depth meshes.
   * @param once - Whether to render it only once or not.
   */
  render(once = false) {
    return this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        if (!this.meshes.size)
          return;
        let shouldRender = false;
        for (const [_uuid, mesh] of this.meshes) {
          if (mesh.visible) {
            shouldRender = true;
            break;
          }
        }
        if (!shouldRender) {
          this.clearDepthTexture();
          return;
        }
        this.renderDepthPass(commandEncoder);
        this.renderer.pipelineManager.resetCurrentPipeline();
      },
      {
        once,
        order: this.index
      }
    );
  }
  /**
   * Render the shadow map only once. Useful with static scenes if autoRender has been set to `false` to only take one snapshot of the shadow map.
   */
  async renderOnce() {
    if (!__privateGet(this, _autoRender)) {
      this.onPropertyChanged("isActive", 1);
      await Promise.all(
        [...this.depthMeshes.values()].map(async (depthMesh) => {
          depthMesh.setGeometry();
          await depthMesh.material.compileMaterial();
        })
      );
      this.render(true);
    }
  }
  /**
   * Render all the {@link meshes} into the {@link depthPassTarget}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  renderDepthPass(commandEncoder) {
    this.renderer.pipelineManager.resetCurrentPipeline();
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor);
    if (!this.renderer.production)
      depthPass.pushDebugGroup(`${this.constructor.name} (index: ${this.index}): depth pass`);
    for (const [uuid, depthMesh] of this.depthMeshes) {
      if (!this.meshes.get(uuid)?.visible) {
        continue;
      }
      depthMesh.render(depthPass);
    }
    if (!this.renderer.production)
      depthPass.popDebugGroup();
    depthPass.end();
  }
  /**
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }) {
    return {
      /** Returned code. */
      code: getDefaultShadowDepthVs(this.index, { bindings, geometry })
    };
  }
  /**
   * Get the default depth pass fragment shader for this {@link Shadow}.
   * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
   */
  getDefaultShadowDepthFs() {
    return false;
  }
  /**
   * Patch the given {@link ProjectedMesh | mesh} material parameters to create the depth mesh.
   * @param mesh - original {@link ProjectedMesh | mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth mesh.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh, parameters = {}) {
    parameters = { ...mesh.material.options.rendering, ...parameters };
    const bindings = [];
    mesh.material.inputsBindings.forEach((binding) => {
      if (binding.name.includes("skin") || binding.name.includes("morphTarget")) {
        bindings.push(binding);
      }
    });
    const instancesBinding = mesh.material.getBufferBindingByName("instances");
    if (instancesBinding) {
      bindings.push(instancesBinding);
    }
    if (parameters.bindings) {
      parameters.bindings = [...bindings, ...parameters.bindings];
    } else {
      parameters.bindings = [...bindings];
    }
    if (!parameters.shaders) {
      parameters.shaders = {
        vertex: this.getDefaultShadowDepthVs({ bindings, geometry: mesh.geometry }),
        fragment: this.getDefaultShadowDepthFs()
      };
    }
    return parameters;
  }
  /**
   * Add a {@link ProjectedMesh | mesh} to the shadow map. Internally called by the {@link ProjectedMesh | mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
   * - {@link patchShadowCastingMeshParams | Patch} the parameters.
   * - Create a new depth {@link Mesh} with the patched parameters.
   * - Add the {@link ProjectedMesh | mesh} to the {@link meshes} Map.
   * @param mesh - {@link ProjectedMesh | mesh} to add to the shadow map.
   * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth mesh.
   */
  addShadowCastingMesh(mesh, parameters = {}) {
    if (this.meshes.get(mesh.uuid))
      return;
    mesh.options.castShadows = true;
    parameters = this.patchShadowCastingMeshParams(mesh, parameters);
    if (this.depthMeshes.get(mesh.uuid)) {
      this.depthMeshes.get(mesh.uuid).remove();
      this.depthMeshes.delete(mesh.uuid);
    }
    const depthMesh = new Mesh(this.renderer, {
      label: `${this.constructor.name} (index: ${this.index}) ${mesh.options.label} depth mesh`,
      ...parameters,
      geometry: mesh.geometry,
      // explicitly set empty output targets
      // we just want to write to the depth texture
      targets: [],
      outputTarget: this.depthPassTarget,
      autoRender: false
    });
    depthMesh.parent = mesh;
    this.depthMeshes.set(mesh.uuid, depthMesh);
    this.meshes.set(mesh.uuid, mesh);
  }
  /**
   * Remove a {@link ProjectedMesh | mesh} from the shadow map and destroy its depth mesh.
   * @param mesh - {@link ProjectedMesh | mesh} to remove.
   */
  removeMesh(mesh) {
    const depthMesh = this.depthMeshes.get(mesh.uuid);
    if (depthMesh) {
      depthMesh.remove();
      this.depthMeshes.delete(mesh.uuid);
    }
    this.meshes.delete(mesh.uuid);
    if (this.meshes.size === 0) {
      this.clearDepthTexture();
    }
  }
  /**
   * If one of the {@link meshes} had its geometry change, update the corresponding depth mesh geometry as well.
   * @param mesh - Original {@link ProjectedMesh} which geometry just changed.
   * @param geometry - New {@link ProjectedMesh} {@link Geometry} to use.
   */
  updateMeshGeometry(mesh, geometry) {
    const depthMesh = this.depthMeshes.get(mesh.uuid);
    if (depthMesh) {
      depthMesh.useGeometry(geometry);
    }
  }
  /**
   * Destroy the {@link Shadow}.
   */
  destroy() {
    this.onPropertyChanged("isActive", 0);
    if (__privateGet(this, _depthPassTaskID) !== null) {
      this.removeDepthPass(__privateGet(this, _depthPassTaskID));
      __privateSet(this, _depthPassTaskID, null);
    }
    this.meshes.forEach((mesh) => this.removeMesh(mesh));
    this.depthMeshes = /* @__PURE__ */ new Map();
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
_autoRender = new WeakMap();
_depthPassTaskID = new WeakMap();
_setParameters = new WeakSet();
setParameters_fn = function({
  intensity = 1,
  bias = 0,
  normalBias = 0,
  pcfSamples = 1,
  depthTextureSize = new Vec2(512),
  depthTextureFormat = "depth24plus",
  autoRender = true
} = {}) {
  this.intensity = intensity;
  this.bias = bias;
  this.normalBias = normalBias;
  this.pcfSamples = pcfSamples;
  this.depthTextureSize = depthTextureSize;
  this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged());
  this.depthTextureFormat = depthTextureFormat;
  __privateSet(this, _autoRender, autoRender);
};

export { Shadow, shadowStruct };
