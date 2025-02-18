import { Vec3 } from '../../math/Vec3.mjs';
import { isCameraRenderer } from '../renderers/utils.mjs';
import { Object3D } from '../objects3D/Object3D.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { sRGBToLinear } from '../../math/color-utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _intensity, _intensityColor;
class Light extends Object3D {
  /**
   * Light constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Light}.
   * @param parameters - {@link LightParams | parameters} used to create this {@link Light}.
   */
  constructor(renderer, { label = "", color = new Vec3(1), intensity = 1, type = "lights" } = {}) {
    super();
    /** @ignore */
    __privateAdd(this, _intensity);
    /**
     * A {@link Vec3} holding the {@link Light} {@link color} multiplied by its {@link intensity}.
     * @private
     */
    __privateAdd(this, _intensityColor);
    this.type = type;
    this.setRenderer(renderer);
    this.uuid = generateUUID();
    this.options = {
      label,
      color,
      intensity
    };
    this.color = color;
    __privateSet(this, _intensityColor, this.color.clone());
    this.color.onChange(() => this.onPropertyChanged("color", this.actualColor));
    this.intensity = intensity;
    this.userData = {};
  }
  /**
   * Set or reset this light {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    const hasRenderer = !!this.renderer;
    if (this.renderer) {
      this.renderer.removeLight(this);
    }
    renderer = isCameraRenderer(renderer, this.constructor.name);
    this.renderer = renderer;
    if (this.index === void 0) {
      this.index = this.renderer.lights.filter((light) => light.type === this.type).length;
    }
    if (!this.renderer.lightsBindingParams || this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type);
    }
    this.renderer.addLight(this);
    this.setRendererBinding();
    if (hasRenderer) {
      this.reset(false);
    }
  }
  /**
   * Set or reset this {@link Light} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    if (this.renderer.bindings[this.type]) {
      this.rendererBinding = this.renderer.bindings[this.type];
    }
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed or when updating the {@link Light} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link Light} shadow if any.
   */
  reset(resetShadow = true) {
    this.setRendererBinding();
    this.onPropertyChanged("color", this.actualColor);
  }
  /**
   * Get this {@link Light} intensity.
   * @returns - The {@link Light} intensity.
   */
  get intensity() {
    return __privateGet(this, _intensity);
  }
  /**
   * Set this {@link Light} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Light} intensity.
   */
  set intensity(value) {
    __privateSet(this, _intensity, value);
    this.onPropertyChanged("color", this.actualColor);
  }
  /**
   * Get the actual {@link Vec3} color used in the shader: convert {@link color} to linear space, then multiply by {@link intensity}.
   * @returns - Actual {@link Vec3} color used in the shader.
   */
  get actualColor() {
    return sRGBToLinear(__privateGet(this, _intensityColor).copy(this.color)).multiplyScalar(this.intensity);
  }
  /**
   * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  onPropertyChanged(propertyKey, value) {
    if (this.rendererBinding && this.rendererBinding.inputs[propertyKey]) {
      if (value instanceof Vec3) {
        this.rendererBinding.inputs[propertyKey].value[this.index * 3] = value.x;
        this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 1] = value.y;
        this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 2] = value.z;
      } else {
        this.rendererBinding.inputs[propertyKey].value[this.index] = value;
      }
      this.rendererBinding.inputs[propertyKey].shouldUpdate = true;
      this.renderer.shouldUpdateCameraLightsBindGroup();
    }
  }
  /**
   * Tell the {@link renderer} that the maximum number for this {@link type} of light has been overflown.
   * @param lightsType - {@link type} of light.
   */
  onMaxLightOverflow(lightsType) {
    this.renderer.onMaxLightOverflow(lightsType, this.index);
    if (this.rendererBinding) {
      this.rendererBinding = this.renderer.bindings[lightsType];
    }
  }
  /**
   * Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
   */
  onBeforeRenderScene() {
    this._onBeforeRenderCallback && this._onBeforeRenderCallback();
  }
  /**
   * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the {@link Light} matrices. The callback won't be called if the {@link renderer} is not ready.
   * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
   * @returns - our {@link Light}
   */
  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback;
    }
    return this;
  }
  /**
   * Remove this {@link Light} from the {@link renderer} and destroy it.
   */
  remove() {
    this.renderer.removeLight(this);
    this.destroy();
  }
  /**
   * Destroy this {@link Light}.
   */
  destroy() {
    super.destroy();
  }
}
_intensity = new WeakMap();
_intensityColor = new WeakMap();

export { Light };
