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
    super(renderer, { color, intensity, type });
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
