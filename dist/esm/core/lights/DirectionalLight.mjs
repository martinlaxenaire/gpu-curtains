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
var _direction;
class DirectionalLight extends Light {
  /**
   * DirectionalLight constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalLight}.
   * @param parameters - {@link DirectionalLightBaseParams} used to create this {@link DirectionalLight}.
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
    this.position.copy(position);
    this.target = new Vec3();
    this.target.onChange(() => {
      this.lookAt(this.target);
    });
    this.target.copy(target);
    this.position.onChange(() => {
      this.lookAt(this.target);
    });
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
    }
  }
  /**
   * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation.
   */
  setDirection() {
    __privateGet(this, _direction).copy(this.target).sub(this.actualPosition).normalize();
    this.onPropertyChanged("direction", __privateGet(this, _direction));
    if (this.shadow) {
      this.shadow.setDirection(__privateGet(this, _direction));
    }
  }
  /**
   * Rotate this {@link DirectionalLight} so it looks at the {@link Vec3 | target}.
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
    this.shadow?.destroy();
  }
}
_direction = new WeakMap();

export { DirectionalLight };
