import { Light } from './Light.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

class AmbientLight extends Light {
  /**
   * AmbientLight constructor
   * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link AmbientLight}.
   * @param parameters - {@link LightBaseParams} used to create this {@link AmbientLight}.
   */
  constructor(renderer, { label = "AmbientLight", color = new Vec3(1), intensity = 0.1 } = {}) {
    const type = "ambientLights";
    super(renderer, { label, color, intensity, type });
  }
  // explicitly disable position as well
  /** @ignore */
  applyPosition() {
  }
}

export { AmbientLight };
