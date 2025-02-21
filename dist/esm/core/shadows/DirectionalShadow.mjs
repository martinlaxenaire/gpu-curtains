import { shadowStruct, Shadow } from './Shadow.mjs';
import { OrthographicCamera } from '../cameras/OrthographicCamera.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Texture } from '../textures/Texture.mjs';
import { getDefaultDirectionalShadowDepthVs } from '../shaders/full/vertex/get-default-directional-shadow-depth-vertex-shader-code.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _direction;
const directionalShadowStruct = {
  ...shadowStruct,
  direction: {
    type: "vec3f",
    value: new Vec3()
  },
  viewMatrix: {
    type: "mat4x4f",
    value: new Float32Array(16)
  },
  projectionMatrix: {
    type: "mat4x4f",
    value: new Float32Array(16)
  }
};
class DirectionalShadow extends Shadow {
  /**
   * DirectionalShadow constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalShadow}.
   * @param parameters - {@link DirectionalShadowParams} used to create this {@link DirectionalShadow}.
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
      left: -10,
      right: 10,
      bottom: -10,
      top: 10,
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
     * Direction of the parent {@link DirectionalLight}. Duplicate to avoid adding the {@link DirectionalLight} binding to vertex shaders.
     * @private
     */
    __privateAdd(this, _direction);
    this.options = {
      ...this.options,
      camera
    };
    this.camera = new OrthographicCamera({
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
      near: camera.near,
      far: camera.far,
      onMatricesChanged: () => {
        this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
        this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
      }
    });
    this.camera.position.set(0);
    this.camera.parent = this.light;
    __privateSet(this, _direction, new Vec3());
  }
  /**
   * Set or reset this {@link DirectionalShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.directionalShadows;
  }
  /**
   * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
   * Called internally by the associated {@link DirectionalLight} if any shadow parameters are specified when creating it. Can also be called directly.
   * @param parameters - parameters to use for this {@link DirectionalShadow}.
   */
  cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera } = {}) {
    if (camera) {
      this.camera.left = camera.left ?? -10;
      this.camera.right = camera.right ?? 10;
      this.camera.top = camera.top ?? 10;
      this.camera.bottom = camera.bottom ?? -10;
      this.camera.near = camera.near ?? 0.1;
      this.camera.far = camera.far ?? 150;
    }
    super.cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender });
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding();
    super.reset();
    this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
    this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
    this.onPropertyChanged("direction", __privateGet(this, _direction));
  }
  /**
   * Copy the {@link DirectionalLight} direction and update binding.
   * @param direction - {@link DirectionalLight} direction to copy.
   */
  setDirection(direction = new Vec3()) {
    __privateGet(this, _direction).copy(direction);
    this.onPropertyChanged("direction", __privateGet(this, _direction));
  }
  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
      name: "directionalShadowDepthTexture" + this.index,
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
   * Get the default depth pass vertex shader for this {@link Shadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }) {
    return {
      /** Returned code. */
      code: getDefaultDirectionalShadowDepthVs(this.index, { bindings, geometry })
    };
  }
}
_direction = new WeakMap();

export { DirectionalShadow, directionalShadowStruct };
