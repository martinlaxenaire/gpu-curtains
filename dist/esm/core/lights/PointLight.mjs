import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { PointShadow } from '../shadows/PointShadow.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _range, _actualPosition;
class PointLight extends Light {
  /**
   * PointLight constructor
   * @param renderer - {@link CameraRenderer | CameraRenderer} used to create this {@link PointLight}.
   * @param parameters - {@link PointLightBaseParams | parameters} used to create this {@link PointLight}.
   */
  constructor(renderer, {
    label = "PointLight",
    color = new Vec3(1),
    intensity = 1,
    position = new Vec3(),
    range = 0,
    shadow = null
  } = {}) {
    const type = "pointLights";
    super(renderer, { label, color, intensity, type });
    /** @ignore */
    __privateAdd(this, _range);
    /** @ignore */
    __privateAdd(this, _actualPosition);
    this.options = {
      ...this.options,
      position,
      range,
      shadow
    };
    __privateSet(this, _actualPosition, new Vec3());
    this.position.copy(position);
    this.range = range;
    this.parent = this.renderer.scene;
    this.shadow = new PointShadow(this.renderer, {
      autoRender: false,
      // will be set by calling cast()
      light: this
    });
    if (shadow) {
      this.shadow.cast(shadow);
    }
  }
  /**
   * Set or reset this {@link PointLight} {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    super.setRenderer(renderer);
    if (this.shadow) {
      this.shadow.setRenderer(renderer);
      this.shadow.updateViewMatrices(__privateGet(this, _actualPosition));
    }
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link PointLight} has been overflowed or when updating the {@link PointLight} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link PointLight} shadow if any. Set to `true` when the {@link renderer} number of {@link PointLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
   */
  reset(resetShadow = true) {
    super.reset();
    this.onPropertyChanged("range", this.range);
    this.onPropertyChanged("position", this.worldMatrix.getTranslation(__privateGet(this, _actualPosition)));
    if (this.shadow && resetShadow) {
      this.shadow.reset();
      this.shadow.updateViewMatrices(__privateGet(this, _actualPosition));
    }
  }
  /**
   * Get this {@link PointLight} range.
   * @returns - The {@link PointLight} range.
   */
  get range() {
    return __privateGet(this, _range);
  }
  /**
   * Set this {@link PointLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link PointLight} range.
   */
  set range(value) {
    __privateSet(this, _range, value);
    this.onPropertyChanged("range", this.range);
  }
  /**
   * Set the {@link PointLight} position based on the {@link worldMatrix} translation and update the {@link PointShadow} view matrices.
   */
  setPosition() {
    this.onPropertyChanged("position", this.worldMatrix.getTranslation(__privateGet(this, _actualPosition)));
    this.shadow?.updateViewMatrices(__privateGet(this, _actualPosition));
  }
  // explicitly disable scale and transform origin transformations
  /** @ignore */
  applyScale() {
  }
  /** @ignore */
  applyTransformOrigin() {
  }
  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new position from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.setPosition();
    }
  }
  /**
   * Tell the {@link renderer} that the maximum number of {@link PointLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType) {
    super.onMaxLightOverflow(lightsType);
    this.shadow?.setRendererBinding();
  }
  /**
   * Destroy this {@link PointLight} and associated {@link PointShadow}.
   */
  destroy() {
    super.destroy();
    this.shadow.destroy();
  }
}
_range = new WeakMap();
_actualPosition = new WeakMap();

export { PointLight };
