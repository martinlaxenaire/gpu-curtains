import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { PlaneGeometry } from '../../core/geometries/PlaneGeometry.mjs';
import { DOMMesh } from './DOMMesh.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
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
  /**
   * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link Plane}
   * It ranges from -1 to 1 on both axis
   * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
   * @returns - raycasted {@link Vec2 | vector} coordinates relative to the {@link Plane}
   */
  mouseToPlaneCoords(mouseCoords = new Vec2()) {
    const worldMouse = {
      x: 2 * (mouseCoords.x / this.renderer.boundingRect.width) - 1,
      y: 2 * (1 - mouseCoords.y / this.renderer.boundingRect.height) - 1
    };
    const rayOrigin = this.camera.position.clone();
    const rayDirection = new Vec3(worldMouse.x, worldMouse.y, -0.5);
    rayDirection.unproject(this.camera);
    rayDirection.sub(rayOrigin).normalize();
    const planeNormals = new Vec3(0, 0, 1);
    planeNormals.applyQuat(this.quaternion).normalize();
    const result = new Vec3(0, 0, 0);
    const denominator = planeNormals.dot(rayDirection);
    if (Math.abs(denominator) >= 1e-4) {
      const inverseViewMatrix = this.worldMatrix.getInverse().premultiply(this.camera.viewMatrix);
      const planeOrigin = this.worldTransformOrigin.clone().add(this.worldPosition);
      const rotatedOrigin = new Vec3(
        this.worldPosition.x - planeOrigin.x,
        this.worldPosition.y - planeOrigin.y,
        this.worldPosition.z - planeOrigin.z
      );
      rotatedOrigin.applyQuat(this.quaternion);
      planeOrigin.add(rotatedOrigin);
      const distance = planeNormals.dot(planeOrigin.clone().sub(rayOrigin)) / denominator;
      result.copy(rayOrigin.add(rayDirection.multiplyScalar(distance)));
      result.applyMat4(inverseViewMatrix);
    } else {
      result.set(Infinity, Infinity, Infinity);
    }
    return new Vec2(result.x, result.y);
  }
}

export { Plane };
