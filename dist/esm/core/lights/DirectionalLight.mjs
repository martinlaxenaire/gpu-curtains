import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { DirectionalShadow } from '../shadows/DirectionalShadow.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _actualPosition, _direction;
class DirectionalLight extends Light {
  /**
   * DirectionalLight constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalLight}.
   * @param parameters - {@link DirectionalLightBaseParams | parameters} used to create this {@link DirectionalLight}.
   */
  constructor(renderer, {
    label = "DirectionalLight",
    color = new Vec3(1),
    intensity = 1,
    position = new Vec3(1),
    target = new Vec3(),
    shadow = null
  } = {}) {
    const type = "directionalLights";
    super(renderer, { label, color, intensity, type });
    /** @ignore */
    __privateAdd(this, _actualPosition);
    /**
     * The {@link Vec3 | direction} of the {@link DirectionalLight} is the {@link target} minus the actual {@link position}.
     * @private
     */
    __privateAdd(this, _direction);
    this.options = {
      ...this.options,
      position,
      target,
      shadow
    };
    __privateSet(this, _direction, new Vec3());
    __privateSet(this, _actualPosition, new Vec3());
    this.target = target;
    this.target.onChange(() => this.setDirection());
    this.position.copy(position);
    this.parent = this.renderer.scene;
    this.shadow = new DirectionalShadow(this.renderer, {
      autoRender: false,
      // will be set by calling cast()
      light: this
    });
    if (shadow) {
      this.shadow.cast(shadow);
    }
  }
  /**
   * Set or reset this {@link DirectionalLight} {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    super.setRenderer(renderer);
    if (this.shadow) {
      this.shadow.setRenderer(renderer);
      this.shadow.updateViewMatrix(__privateGet(this, _actualPosition), this.target);
    }
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed or when updating the {@link DirectionalLight} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link DirectionalLight} shadow if any. Set to `true` when the {@link renderer} number of {@link DirectionalLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
   */
  reset(resetShadow = true) {
    super.reset();
    this.onPropertyChanged("direction", __privateGet(this, _direction));
    if (this.shadow && resetShadow) {
      this.shadow.reset();
      this.shadow.updateViewMatrix(__privateGet(this, _actualPosition), this.target);
    }
  }
  /**
   * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation and update the {@link DirectionalShadow} view matrix.
   */
  setDirection() {
    __privateGet(this, _direction).copy(this.target).sub(this.worldMatrix.getTranslation(__privateGet(this, _actualPosition))).normalize();
    this.onPropertyChanged("direction", __privateGet(this, _direction));
    this.shadow?.updateViewMatrix(__privateGet(this, _actualPosition), this.target);
  }
  // explicitly disable scale and transform origin transformations
  /** @ignore */
  applyScale() {
  }
  /** @ignore */
  applyTransformOrigin() {
  }
  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.setDirection();
    }
  }
  /**
   * Tell the {@link renderer} that the maximum number of {@link DirectionalLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType) {
    super.onMaxLightOverflow(lightsType);
    this.shadow?.setRendererBinding();
  }
  /**
   * Destroy this {@link DirectionalLight} and associated {@link DirectionalShadow}.
   */
  destroy() {
    super.destroy();
    this.shadow.destroy();
  }
}
_actualPosition = new WeakMap();
_direction = new WeakMap();

export { DirectionalLight };
