import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { SpotShadow } from '../shadows/SpotShadow.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _direction, _angle, _penumbra, _range;
class SpotLight extends Light {
  /**
   * SpotLight constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotLight}.
   * @param parameters - {@link SpotLightBaseParams} used to create this {@link SpotLight}.
   */
  constructor(renderer, {
    label = "SpotLight",
    color = new Vec3(1),
    intensity = 1,
    position = new Vec3(1),
    target = new Vec3(),
    angle = Math.PI / 3,
    penumbra = 0,
    range = 0,
    shadow = null
  } = {}) {
    const type = "spotLights";
    super(renderer, { label, color, intensity, type });
    /**
     * The {@link Vec3 | direction} of the {@link SpotLight} is the {@link target} minus the actual {@link position}.
     * @private
     */
    __privateAdd(this, _direction);
    /** @ignore */
    __privateAdd(this, _angle);
    /** @ignore */
    __privateAdd(this, _penumbra);
    /** @ignore */
    __privateAdd(this, _range);
    this.options = {
      ...this.options,
      position,
      range,
      angle,
      penumbra,
      target,
      shadow
    };
    __privateSet(this, _direction, new Vec3());
    this.position.copy(position);
    this.target = new Vec3();
    this.target.onChange(() => {
      this.lookAt(this.target);
    });
    this.target.copy(target);
    this.position.onChange(() => {
      this.lookAt(this.target);
    });
    this.angle = angle;
    this.penumbra = penumbra;
    this.range = range;
    this.parent = this.renderer.scene;
    this.shadow = new SpotShadow(this.renderer, {
      autoRender: false,
      // will be set by calling cast()
      light: this
    });
    if (shadow) {
      this.shadow.cast(shadow);
    }
  }
  /**
   * Set or reset this {@link SpotLight} {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    super.setRenderer(renderer);
    if (this.shadow) {
      this.shadow.setRenderer(renderer);
    }
  }
  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link SpotLight} has been overflowed or when updating the {@link SpotLight} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link SpotLight} shadow if any. Set to `true` when the {@link renderer} number of {@link SpotLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
   */
  reset(resetShadow = true) {
    super.reset();
    this.onPropertyChanged("range", this.range);
    this.onPropertyChanged("coneCos", Math.cos(this.angle));
    this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
    this.onPropertyChanged("position", this.actualPosition);
    this.onPropertyChanged("direction", __privateGet(this, _direction));
    if (this.shadow && resetShadow) {
      this.shadow.reset();
    }
  }
  /**
   * Set the {@link SpotLight} position and direction based on the {@link target} and the {@link worldMatrix} translation.
   */
  setPositionDirection() {
    this.onPropertyChanged("position", this.actualPosition);
    __privateGet(this, _direction).copy(this.target).sub(this.actualPosition).normalize();
    this.onPropertyChanged("direction", __privateGet(this, _direction));
    if (this.shadow) {
      this.shadow.setDirection(__privateGet(this, _direction));
    }
  }
  /**
   * Get this {@link SpotLight} angle.
   * @returns - The {@link SpotLight} angle.
   */
  get angle() {
    return __privateGet(this, _angle);
  }
  /**
   * Set this {@link SpotLight} angle and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} angle in the `[0, PI / 2]` range.
   */
  set angle(value) {
    __privateSet(this, _angle, Math.min(Math.PI / 2, Math.max(0, value)));
    this.onPropertyChanged("coneCos", Math.cos(this.angle));
    this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
    this.shadow?.setCameraFov();
  }
  /**
   * Get this {@link SpotLight} penumbra.
   * @returns - The {@link SpotLight} penumbra.
   */
  get penumbra() {
    return __privateGet(this, _penumbra);
  }
  /**
   * Set this {@link SpotLight} penumbra and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} penumbra in the `[0, 1]` range.
   */
  set penumbra(value) {
    __privateSet(this, _penumbra, Math.min(1, Math.max(0, value)));
    this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
  }
  /**
   * Get this {@link SpotLight} range.
   * @returns - The {@link SpotLight} range.
   */
  get range() {
    return __privateGet(this, _range);
  }
  /**
   * Set this {@link SpotLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} range.
   */
  set range(value) {
    __privateSet(this, _range, Math.max(0, value));
    this.onPropertyChanged("range", this.range);
    if (this.shadow && this.range !== 0) {
      this.shadow.camera.far = this.range;
    }
  }
  /**
   * Rotate this {@link SpotLight} so it looks at the {@link Vec3 | target}.
   * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
   */
  lookAt(target = new Vec3()) {
    this.updateModelMatrix();
    this.updateWorldMatrix(true, false);
    if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) {
      this.up.set(0, 0, 1);
    } else {
      this.up.set(0, 1, 0);
    }
    this.applyLookAt(this.actualPosition, target);
  }
  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new position and direction from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.setPositionDirection();
    }
  }
  /**
   * Tell the {@link renderer} that the maximum number of {@link SpotLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType) {
    super.onMaxLightOverflow(lightsType);
    this.shadow?.setRendererBinding();
  }
  /**
   * Destroy this {@link SpotLight} and associated {@link SpotShadow}.
   */
  destroy() {
    super.destroy();
    this.shadow?.destroy();
  }
}
_direction = new WeakMap();
_angle = new WeakMap();
_penumbra = new WeakMap();
_range = new WeakMap();

export { SpotLight };
