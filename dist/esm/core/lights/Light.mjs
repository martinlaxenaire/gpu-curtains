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
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _intensity, _intensityColor;
class Light extends Object3D {
  constructor(renderer, { color = new Vec3(1), intensity = 1, index = 0, type = "lights" } = {}) {
    super();
    __privateAdd(this, _intensity, void 0);
    __privateAdd(this, _intensityColor, void 0);
    this.type = type;
    Object.defineProperty(this, "index", { value: index });
    renderer = isCameraRenderer(renderer, this.constructor.name);
    this.renderer = renderer;
    this.setRendererBinding();
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
    this.renderer.addLight(this);
  }
  setRendererBinding() {
    if (this.renderer.bindings[this.type]) {
      this.rendererBinding = this.renderer.bindings[this.type];
    }
  }
  reset() {
    this.setRendererBinding();
    this.onPropertyChanged("color", __privateGet(this, _intensityColor).copy(this.color).multiplyScalar(this.intensity));
  }
  get intensity() {
    return __privateGet(this, _intensity);
  }
  set intensity(value) {
    __privateSet(this, _intensity, value);
    this.onPropertyChanged("color", __privateGet(this, _intensityColor).copy(this.color).multiplyScalar(this.intensity));
  }
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
  onMaxLightOverflow(lightsType) {
    if (this.rendererBinding) {
      this.renderer.onMaxLightOverflow(lightsType);
      this.rendererBinding = this.renderer.bindings[lightsType];
    }
  }
  remove() {
    this.renderer.removeLight(this);
  }
  destroy() {
    this.parent = null;
  }
}
_intensity = new WeakMap();
_intensityColor = new WeakMap();

export { Light };
