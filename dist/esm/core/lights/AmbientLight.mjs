import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

class AmbientLight extends Light {
  /**
   * AmbientLight constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link AmbientLight}.
   * @param parameters - {@link LightBaseParams | parameters} used to create this {@link AmbientLight}.
   */
  constructor(renderer, { color = new Vec3(1), intensity = 0.1 } = {}) {
    const type = "ambientLights";
    const index = renderer.lights.filter((light) => light.type === type).length;
    super(renderer, { color, intensity, index, type });
    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type);
    }
    this.rendererBinding.inputs.count.value = this.index + 1;
    this.rendererBinding.inputs.count.shouldUpdate = true;
  }
  // explicitly disable all kinds of transformations
  /** @ignore */
  applyRotation() {
  }
  /** @ignore */
  applyPosition() {
  }
  /** @ignore */
  applyScale() {
  }
  /** @ignore */
  applyTransformOrigin() {
  }
}

export { AmbientLight };
