import { shadowStruct, Shadow } from './Shadow.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Texture } from '../textures/Texture.mjs';
import { getDefaultPointShadowDepthVs, getDefaultPointShadowDepthFs } from '../shaders/chunks/shading/shadows.mjs';

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
var _tempCubeDirection;
const pointShadowStruct = {
  face: {
    type: "i32",
    value: 0
  },
  ...shadowStruct,
  cameraNear: {
    type: "f32",
    value: 0
  },
  cameraFar: {
    type: "f32",
    value: 0
  },
  projectionMatrix: {
    type: "mat4x4f",
    value: new Float32Array(16)
  },
  viewMatrices: {
    type: "array<mat4x4f>",
    value: new Float32Array(16 * 6)
  }
};
class PointShadow extends Shadow {
  /**
   * PointShadow constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link PointShadow}.
   * @param parameters - {@link PointShadowParams | parameters} used to create this {@link PointShadow}.
   */
  constructor(renderer, {
    light,
    intensity,
    bias,
    normalBias,
    pcfSamples,
    depthTextureSize,
    depthTextureFormat,
    autoRender,
    camera = {
      near: 0.1,
      far: 150
    }
  } = {}) {
    super(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender
    });
    /**
     * {@link Vec3} used to calculate the actual current direction based on the {@link PointLight} position.
     * @private
     */
    __privateAdd(this, _tempCubeDirection, void 0);
    this.options = {
      ...this.options,
      camera
    };
    this.cubeDirections = [
      new Vec3(-1, 0, 0),
      new Vec3(1, 0, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 1, 0),
      new Vec3(0, 0, -1),
      new Vec3(0, 0, 1)
    ];
    __privateSet(this, _tempCubeDirection, new Vec3());
    this.cubeUps = [
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1),
      new Vec3(0, -1, 0),
      new Vec3(0, -1, 0)
    ];
    if (camera.far <= 0) {
      camera.far = 150;
    }
    this.camera = {
      projectionMatrix: new Mat4(),
      viewMatrices: [],
      _near: camera.near,
      _far: camera.far
    };
    for (let i = 0; i < 6; i++) {
      this.camera.viewMatrices.push(new Mat4());
    }
    const _self = this;
    const cameraProps = ["near", "far"];
    cameraProps.forEach((prop) => {
      Object.defineProperty(_self.camera, prop, {
        get() {
          return _self.camera["_" + prop];
        },
        set(v) {
          _self.camera["_" + prop] = v;
          _self.updateProjectionMatrix();
        }
      });
    });
  }
  /**
   * Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.pointShadows;
  }
  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link PointLight} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link PointShadow}.
   */
  cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera } = {}) {
    if (camera) {
      this.camera.near = camera.near ?? 0.1;
      this.camera.far = camera.far !== void 0 ? camera.far : this.light.range > 0 ? this.light.range : 150;
    }
    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender });
  }
  /**
   * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
   */
  init() {
    super.init();
    this.updateProjectionMatrix();
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed.
   */
  reset() {
    this.setRendererBinding();
    super.reset();
    this.updateProjectionMatrix();
  }
  /**
   * Update the {@link PointShadow#camera.projectionMatrix | camera perspective projection matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  updateProjectionMatrix() {
    this.camera.projectionMatrix.identity().makePerspective({
      near: this.camera.near,
      far: this.camera.far,
      fov: 90,
      aspect: 1
    });
    this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
    this.onPropertyChanged("cameraNear", this.camera.near);
    this.onPropertyChanged("cameraFar", this.camera.far);
  }
  /**
   * Update the {@link PointShadow#camera.viewMatrices | camera view matrices} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param position - {@link Vec3} to use as position for the {@link PointShadow#camera.viewMatrices | camera view matrices}, based on the {@link light} position.
   */
  updateViewMatrices(position = new Vec3()) {
    for (let i = 0; i < 6; i++) {
      __privateGet(this, _tempCubeDirection).copy(this.cubeDirections[i]).add(position);
      this.camera.viewMatrices[i].makeView(position, __privateGet(this, _tempCubeDirection), this.cubeUps[i]);
      for (let j = 0; j < 16; j++) {
        this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.value[i * 16 + j] = this.camera.viewMatrices[i].elements[j];
      }
    }
    this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.shouldUpdate = true;
  }
  /**
   * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
   */
  setDepthTexture() {
    if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) {
      const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
      this.depthTexture.options.fixedSize.width = maxSize;
      this.depthTexture.options.fixedSize.height = maxSize;
      this.depthTexture.size.width = maxSize;
      this.depthTexture.size.height = maxSize;
      this.depthTexture.createTexture();
      if (this.depthPassTarget) {
        this.depthPassTarget.resize();
      }
    } else if (!this.depthTexture) {
      this.createDepthTexture();
    }
  }
  /**
   * Create the cube {@link depthTexture}.
   */
  createDepthTexture() {
    const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.constructor.name} (index: ${this.index}) depth texture`,
      name: "pointShadowCubeDepthTexture" + this.index,
      type: "depth",
      format: this.depthTextureFormat,
      viewDimension: "cube",
      sampleCount: this.sampleCount,
      fixedSize: {
        width: maxSize,
        height: maxSize
      },
      autoDestroy: false
      // do not destroy when removing a mesh
    });
  }
  /**
   * Remove the depth pass from its {@link utils/TasksQueueManager.TasksQueueManager | task queue manager}.
   * @param depthPassTaskID - Task queue manager ID to use for removal.
   */
  removeDepthPass(depthPassTaskID) {
    this.renderer.onBeforeCommandEncoderCreation.remove(depthPassTaskID);
  }
  /**
   * Render the depth pass. This happens before creating the {@link CameraRenderer} command encoder.<br>
   * - Force all the {@link meshes} to use their depth materials
   * - For each face of the depth cube texture:
   *   - Create a command encoder.
   *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
   *   - Update the face index
   *   - Render all the {@link meshes}
   *   - Submit the command encoder
   * - Reset all the {@link meshes} materials to their original one.
   * @param once - Whether to render it only once or not.
   */
  render(once = false) {
    return this.renderer.onBeforeCommandEncoderCreation.add(
      () => {
        if (!this.meshes.size)
          return;
        this.renderer.setCameraBindGroup();
        this.useDepthMaterials();
        for (let i = 0; i < 6; i++) {
          const commandEncoder = this.renderer.device.createCommandEncoder();
          if (!this.renderer.production)
            commandEncoder.pushDebugGroup(
              `${this.constructor.name} (index: ${this.index}): depth pass command encoder for face ${i}`
            );
          this.depthPassTarget.renderPass.setRenderPassDescriptor(
            this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + " cube face view " + i,
              dimension: "2d",
              arrayLayerCount: 1,
              baseArrayLayer: i
            })
          );
          this.rendererBinding.childrenBindings[this.index].inputs.face.value = i;
          this.renderer.shouldUpdateCameraLightsBindGroup();
          this.renderer.updateCameraLightsBindGroup();
          this.renderDepthPass(commandEncoder);
          if (!this.renderer.production)
            commandEncoder.popDebugGroup();
          const commandBuffer = commandEncoder.finish();
          this.renderer.device.queue.submit([commandBuffer]);
        }
        this.useOriginalMaterials();
        this.renderer.pipelineManager.resetCurrentPipeline();
      },
      {
        once,
        order: this.index
      }
    );
  }
  /**
   * Get the default depth pass vertex shader for this {@link PointShadow}.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs(hasInstances = false) {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthVs(this.index, hasInstances)
    };
  }
  /**
   * Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
   * @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
   */
  getDefaultShadowDepthFs() {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthFs(this.index)
    };
  }
}
_tempCubeDirection = new WeakMap();

export { PointShadow, pointShadowStruct };
