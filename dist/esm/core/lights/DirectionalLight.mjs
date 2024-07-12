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
var _direction, _actualPosition;
let directionalLightIndex = 0;
class DirectionalLight extends Light {
  constructor(renderer, {
    color = new Vec3(1),
    intensity = 1,
    position = new Vec3(),
    target = new Vec3(),
    shadow = null
  } = {}) {
    super(renderer, { color, intensity, index: directionalLightIndex++, type: "directionalLights" });
    __privateAdd(this, _direction, void 0);
    __privateAdd(this, _actualPosition, void 0);
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
    this.rendererBinding.inputs.count.value = directionalLightIndex;
    this.rendererBinding.inputs.count.shouldUpdate = true;
    this.shadow = new DirectionalShadow(this.renderer, { light: this });
    if (shadow) {
      this.shadow.cast(shadow);
    }
  }
  reset() {
    super.reset();
    this.setDirection();
    this.shadow?.reset();
  }
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
   * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the matrix translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.setDirection();
    }
  }
  onMaxLightOverflow(lightsType) {
    super.onMaxLightOverflow(lightsType);
    this.shadow?.setRendererBinding();
  }
  destroy() {
    super.destroy();
    this.shadow.destroy();
  }
}
_direction = new WeakMap();
_actualPosition = new WeakMap();

export { DirectionalLight };
