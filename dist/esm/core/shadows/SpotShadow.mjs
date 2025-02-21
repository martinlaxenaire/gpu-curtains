import { shadowStruct, Shadow } from './Shadow.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { PerspectiveCamera } from '../cameras/PerspectiveCamera.mjs';
import { Texture } from '../textures/Texture.mjs';
import { getDefaultSpotShadowDepthVs } from '../shaders/full/vertex/get-default-spot-shadow-depth-vertex-shader-code.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _direction;
const spotShadowStruct = {
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
class SpotShadow extends Shadow {
  /**
   * SpotShadow constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotShadow}.
   * @param parameters - {@link SpotShadowParams} used to create this {@link SpotShadow}.
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
     * Direction of the parent {@link SpotLight}. Duplicate to avoid adding the {@link SpotLight} binding to vertex shaders.
     * @private
     */
    __privateAdd(this, _direction);
    this.focus = 1;
    this.camera = new PerspectiveCamera({
      near: 0.1,
      far: this.light.range !== 0 ? this.light.range : 150,
      fov: 180 / Math.PI * 2 * this.light.angle * this.focus,
      width: this.options.depthTextureSize.x,
      height: this.options.depthTextureSize.y,
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
   * Set or reset this {@link SpotShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    this.rendererBinding = this.renderer.bindings.spotShadows;
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link SpotLight} has been overflowed or when the {@link renderer} has changed.
   */
  reset() {
    this.setRendererBinding();
    super.reset();
    this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
    this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
    this.onPropertyChanged("direction", __privateGet(this, _direction));
  }
  /**
   * Copy the {@link SpotLight} direction and update binding.
   * @param direction - {@link SpotLight} direction to copy.
   */
  setDirection(direction = new Vec3()) {
    __privateGet(this, _direction).copy(direction);
    this.onPropertyChanged("direction", __privateGet(this, _direction));
  }
  /**
   * Set the {@link PerspectiveCamera#fov | camera fov} based on the {@link SpotLight#angle | SpotLight angle}.
   */
  setCameraFov() {
    this.camera.fov = 180 / Math.PI * 2 * this.light.angle * this.focus;
  }
  /**
   * Reset the {@link depthTexture} when the {@link depthTextureSize} changes and update camera ratio.
   */
  onDepthTextureSizeChanged() {
    super.setDepthTexture();
    this.camera.setSize({
      width: this.depthTextureSize.x,
      height: this.depthTextureSize.y
    });
  }
  /**
   * Create the {@link depthTexture}.
   */
  createDepthTexture() {
    this.depthTexture = new Texture(this.renderer, {
      label: `${this.light.options.label} (index: ${this.light.index}) shadow depth texture`,
      name: "spotShadowDepthTexture" + this.index,
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
   * Get the default depth pass vertex shader for this {@link SpotShadow}.
   * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
   * @returns - Depth pass vertex shader.
   */
  getDefaultShadowDepthVs({ bindings = [], geometry }) {
    return {
      /** Returned code. */
      code: getDefaultSpotShadowDepthVs(this.index, { bindings, geometry })
    };
  }
}
_direction = new WeakMap();

export { SpotShadow, spotShadowStruct };
