import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { PlaneGeometry } from '../../core/geometries/PlaneGeometry.mjs';
import { DOMMesh } from './DOMMesh.mjs';
import { cacheManager } from '../../utils/CacheManager.mjs';

const defaultPlaneParams = {
  label: "Plane",
  // geometry
  instancesCount: 1,
  vertexBuffers: []
};
class Plane extends DOMMesh {
  /**
   * Plane constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
   * @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
   */
  constructor(renderer, element, parameters = {}) {
    renderer = isCurtainsRenderer(renderer, parameters.label ? parameters.label + " Plane" : "Plane");
    const params = { ...defaultPlaneParams, ...parameters };
    let { geometry, widthSegments, heightSegments, ...DOMMeshParams2 } = params;
    const { instancesCount, vertexBuffers, ...materialParams } = DOMMeshParams2;
    if (!geometry || geometry.type !== "PlaneGeometry") {
      widthSegments = widthSegments ?? 1;
      heightSegments = heightSegments ?? 1;
      const geometryID = widthSegments * heightSegments + widthSegments;
      if (!vertexBuffers.length) {
        geometry = cacheManager.getPlaneGeometryByID(geometryID);
      }
      if (!geometry) {
        geometry = new PlaneGeometry({ widthSegments, heightSegments, instancesCount, vertexBuffers });
        cacheManager.addPlaneGeometry(geometry);
      } else {
        geometry.instancesCount = instancesCount;
      }
    }
    super(renderer, element, { geometry, ...materialParams });
    this.type = "Plane";
  }
}

export { Plane };
