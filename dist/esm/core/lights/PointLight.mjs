import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { PointShadow } from '../shadows/PointShadow.mjs';

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
var _range, _actualPosition;
let pointLightIndex = 0;
class PointLight extends Light {
  constructor(renderer, { color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0, shadow = null } = {}) {
    super(renderer, { color, intensity, index: pointLightIndex++, type: "pointLights" });
    __privateAdd(this, _range, void 0);
    __privateAdd(this, _actualPosition, void 0);
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
    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type);
    }
    this.rendererBinding.inputs.count.value = pointLightIndex;
    this.rendererBinding.inputs.count.shouldUpdate = true;
    this.shadow = new PointShadow(this.renderer, { light: this });
    if (shadow) {
      this.shadow.cast(shadow);
    }
  }
  reset() {
    super.reset();
    this.onPropertyChanged("range", this.range);
    this.setPosition();
    this.shadow?.reset();
  }
  get range() {
    return __privateGet(this, _range);
  }
  set range(value) {
    __privateSet(this, _range, value);
    this.onPropertyChanged("range", this.range);
  }
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
   * If the {@link modelMatrix | model matrix} has been updated, set the new position from the matrix translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.setPosition();
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
_range = new WeakMap();
_actualPosition = new WeakMap();

export { PointLight };
