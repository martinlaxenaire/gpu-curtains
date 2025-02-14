import { shadowStruct, Shadow } from './Shadow.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Texture } from '../textures/Texture.mjs';
import { getDefaultPointShadowDepthVs } from '../shaders/full/vertex/get-default-point-shadow-depth-vertex-shader-code.mjs';
import { getDefaultPointShadowDepthFs } from '../shaders/full/fragment/get-default-point-shadow-depth-fragment-code.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _tempCubeDirection;
const pointShadowStruct = {
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
    __privateAdd(this, _tempCubeDirection);
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
   * Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
   */
  clearDepthTexture() {
    if (!this.depthTexture || !this.depthTexture.texture) return;
    const commandEncoder = this.renderer.device.createCommandEncoder();
    !this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
    for (let i = 0; i < 6; i++) {
      const view = this.depthTexture.texture.createView({
        label: "Clear " + this.depthTexture.texture.label + " cube face view",
        dimension: "2d",
        arrayLayerCount: 1,
        baseArrayLayer: i
      });
      const renderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
          view,
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
    }
    !this.renderer.production && commandEncoder.popDebugGroup();
    this.renderer.device.queue.submit([commandEncoder.finish()]);
  }
  /**
   * Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
   * - For each face of the depth cube texture:
   *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
   *   - Render all the depth meshes.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   */
  render(commandEncoder) {
    if (!this.castingMeshes.size) return;
    let shouldRender = false;
    for (const [_uuid, mesh] of this.castingMeshes) {
      if (mesh.visible) {
        shouldRender = true;
        break;
      }
    }
    if (!shouldRender) {
      this.clearDepthTexture();
      return;
    }
    for (let face = 0; face < 6; face++) {
      this.depthPassTarget.renderPass.setRenderPassDescriptor(
        this.depthTexture.texture.createView({
          label: this.depthTexture.texture.label + " cube face view " + face,
          dimension: "2d",
          arrayLayerCount: 1,
          baseArrayLayer: face
        })
      );
      this.renderDepthPass(commandEncoder, face);
    }
    this.renderer.pipelineManager.resetCurrentPipeline();
  }
  /**
   * Render all the {@link castingMeshes} into the {@link depthPassTarget}. Before rendering them, we swap the cube face bind group with the {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} at the index containing the current face onto which we'll draw.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   * @param face - Current cube map face onto which we're drawing.
   */
  renderDepthPass(commandEncoder, face = 0) {
    this.renderer.pipelineManager.resetCurrentPipeline();
    const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor);
    if (!this.renderer.production)
      depthPass.pushDebugGroup(`${this.constructor.name} (index: ${this.index}): depth pass for face ${face}`);
    for (const [uuid, depthMesh] of this.depthMeshes) {
      if (!this.castingMeshes.get(uuid)?.visible) {
        continue;
      }
      const cubeFaceBindGroupIndex = depthMesh.material.bindGroups.length - 1;
      this.renderer.pointShadowsCubeFaceBindGroups[face].setIndex(cubeFaceBindGroupIndex);
      depthMesh.material.bindGroups[cubeFaceBindGroupIndex] = this.renderer.pointShadowsCubeFaceBindGroups[face];
      depthMesh.render(depthPass);
    }
    if (!this.renderer.production) depthPass.popDebugGroup();
    depthPass.end();
  }
  /**
   * Get the default depth pass vertex shader for this {@link PointShadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }) {
    return {
      /** Returned code. */
      code: getDefaultPointShadowDepthVs(this.index, { bindings, geometry })
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
  /**
   * Patch the given {@link Mesh} material parameters to create the depth mesh. Here we'll be adding the first {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} bind group containing the face index onto which we'll be drawing. This bind group will be swapped when rendering using {@link renderDepthPass}.
   * @param mesh - original {@link Mesh} to use.
   * @param parameters - Optional additional parameters to use for the depth mesh.
   * @returns - Patched parameters.
   */
  patchShadowCastingMeshParams(mesh, parameters = {}) {
    if (!parameters.bindGroups) {
      parameters.bindGroups = [];
    }
    parameters.bindGroups = [...parameters.bindGroups, this.renderer.pointShadowsCubeFaceBindGroups[0]];
    return super.patchShadowCastingMeshParams(mesh, parameters);
  }
}
_tempCubeDirection = new WeakMap();

export { PointShadow, pointShadowStruct };
