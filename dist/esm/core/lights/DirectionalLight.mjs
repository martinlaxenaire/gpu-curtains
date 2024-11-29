import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { DirectionalShadow } from '../shadows/DirectionalShadow.mjs';

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
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _actualPosition, _direction;
class DirectionalLight extends Light {
  /**
   * DirectionalLight constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalLight}.
   * @param parameters - {@link DirectionalLightBaseParams | parameters} used to create this {@link DirectionalLight}.
   */
  constructor(renderer, {
    color = new Vec3(1),
    intensity = 1,
    position = new Vec3(1),
    target = new Vec3(),
    shadow = null
  } = {}) {
    const type = "directionalLights";
    renderer = renderer && renderer.renderer || renderer;
    const index = renderer.lights.filter((light) => light.type === type).length;
    super(renderer, { color, intensity, index, type });
    /** @ignore */
    __privateAdd(this, _actualPosition, void 0);
    /**
     * The {@link Vec3 | direction} of the {@link DirectionalLight} is the {@link target} minus the actual {@link position}.
     * @private
     */
    __privateAdd(this, _direction, void 0);
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
    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type);
    }
    this.rendererBinding.inputs.count.value = this.index + 1;
    this.rendererBinding.inputs.count.shouldUpdate = true;
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
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed.
   */
  reset() {
    super.reset();
    this.setDirection();
    this.shadow?.reset();
  }
  /**
   * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation and update the {@link DirectionalShadow} view matrix.
   */
  setDirection() {
    __privateGet(this, _direction).copy(this.target).sub(this.worldMatrix.getTranslation(__privateGet(this, _actualPosition)));
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
