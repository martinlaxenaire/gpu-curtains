import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../../core/geometries/PlaneGeometry'
import { DOMMesh } from './DOMMesh'
import { Vec3 } from '../../math/Vec3'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'

const defaultPlaneParams = {
  label: 'Plane',

  // geometry
  widthSegments: 1,
  heightSegments: 1,
  instancesCount: 1,
  vertexBuffers: [],
}

export class Plane extends DOMMesh {
  constructor(renderer, element, parameters = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isCurtainsRenderer(renderer, parameters.label ? parameters.label + ' Plane' : 'Plane')

    // assign default params if needed
    const params = { ...defaultPlaneParams, ...parameters }

    let { geometry } = params
    const { widthSegments, heightSegments, instancesCount, vertexBuffers, ...domMeshParams } = params

    // can we get a cached geometry?
    if (!geometry || geometry.type !== 'PlaneGeometry') {
      const geometryID = widthSegments * heightSegments + widthSegments
      geometry = !vertexBuffers.length && cacheManager.getPlaneGeometryByID(geometryID)

      if (!geometry) {
        // we need to create a new plane geometry
        geometry = new PlaneGeometry({ widthSegments, heightSegments, instancesCount, vertexBuffers })
        cacheManager.addPlaneGeometry(geometry)
      } else {
        geometry.instancesCount = instancesCount
      }
    }

    // get DOMMesh params
    super(renderer, element, { geometry, ...domMeshParams })

    this.type = 'Plane'
  }

  mouseToPlaneCoords(mouseCoords = new Vec2()) {
    // TODO simplify if no rotation set?
    // raycasting
    // based on https://people.cs.clemson.edu/~dhouse/courses/405/notes/raycast.pdf

    // convert mouse position to 3d normalised device coordinates (from [-1, -1] to [1, 1])
    const worldMouse = {
      x: 2 * (mouseCoords.x / this.renderer.boundingRect.width) - 1,
      y: 2 * (1 - mouseCoords.y / this.renderer.boundingRect.height) - 1,
    }

    const rayOrigin = this.camera.position.clone()

    // ray direction based on normalised coordinates and plane translation
    const rayDirection = new Vec3(worldMouse.x, worldMouse.y, -0.5)

    // unproject ray direction
    rayDirection.unproject(this.camera)
    rayDirection.sub(rayOrigin).normalize()

    // plane normals (could also be [0, 0, -1], makes no difference, raycasting lands the same result for both face)
    const planeNormals = new Vec3(0, 0, 1)

    // apply plane quaternion to plane normals
    planeNormals.applyQuat(this.quaternion).normalize()

    const result = new Vec3(0, 0, 0)

    const denominator = planeNormals.dot(rayDirection)

    if (Math.abs(denominator) >= 0.0001) {
      const inverseViewMatrix = this.modelMatrix.getInverse().multiply(this.camera.viewMatrix)

      // get the plane's center coordinates
      // start with our transform origin point
      const planeOrigin = this.worldTransformOrigin.clone().add(this.worldPosition)

      // rotate our transform origin about world center
      const rotatedOrigin = new Vec3(
        this.worldPosition.x - planeOrigin.x,
        this.worldPosition.y - planeOrigin.y,
        this.worldPosition.z - planeOrigin.z
      )
      rotatedOrigin.applyQuat(this.quaternion)

      // add it to our plane origin
      planeOrigin.add(rotatedOrigin)

      // distance from ray origin to plane
      const distance = planeNormals.dot(planeOrigin.clone().sub(rayOrigin)) / denominator
      result.copy(rayOrigin.add(rayDirection.multiplyScalar(distance)))

      result.applyMat4(inverseViewMatrix)
    } else {
      // no intersection!
      result.set(Infinity, Infinity, Infinity)
    }

    return new Vec2(result.x, result.y)
  }
}
