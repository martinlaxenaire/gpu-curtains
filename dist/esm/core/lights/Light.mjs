import { Vec3 } from '../../math/Vec3.mjs';
import { isCameraRenderer } from '../renderers/utils.mjs';
import { Object3D } from '../objects3D/Object3D.mjs';
import { generateUUID } from '../../utils/utils.mjs';

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
var _intensity, _intensityColor;
class Light extends Object3D {
  /**
   * Light constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Light}.
   * @param parameters - {@link LightParams | parameters} used to create this {@link Light}.
   */
  constructor(renderer, { color = new Vec3(1), intensity = 1, type = "lights" } = {}) {
    super();
    /** @ignore */
    __privateAdd(this, _intensity, void 0);
    /**
     * A {@link Vec3} holding the {@link Light} {@link color} multiplied by its {@link intensity}.
     * @private
     */
    __privateAdd(this, _intensityColor, void 0);
    this.type = type;
    this.setRenderer(renderer);
    this.uuid = generateUUID();
    this.options = {
      color,
      intensity
    };
    this.color = color;
    __privateSet(this, _intensityColor, this.color.clone());
    this.color.onChange(
      () => this.onPropertyChanged("color", __privateGet(this, _intensityColor).copy(this.color).multiplyScalar(this.intensity))
    );
    this.intensity = intensity;
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
    this.index = this.renderer.lights.filter((light) => light.type === this.type).length;
    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type);
    }
    this.renderer.addLight(this);
    this.setRendererBinding();
    if (hasRenderer) {
      this.reset();
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
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed.
   */
  reset() {
    this.setRendererBinding();
    this.onPropertyChanged("color", __privateGet(this, _intensityColor).copy(this.color).multiplyScalar(this.intensity));
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
    this.onPropertyChanged("color", __privateGet(this, _intensityColor).copy(this.color).multiplyScalar(this.intensity));
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
    this.renderer.onMaxLightOverflow(lightsType);
    if (this.rendererBinding) {
      this.rendererBinding = this.renderer.bindings[lightsType];
    }
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
