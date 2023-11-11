import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Vec3 } from '../../math/Vec3'
import { GeometryBaseParams } from '../../types/Geometries'

/**
 * Parameters used to create a {@link BoxGeometry}
 */
interface BoxGeometryParams extends GeometryBaseParams {
  /** Number of segments along the X axis */
  widthSegments?: number
  /** Number of segments along the Y axis */
  heightSegments?: number
  /** Number of segments along the Z axis */
  depthSegments?: number
}

/**
 * BoxGeometry class:
 * Helper to easily create 3D box indexed geometries.
 * @extends IndexedGeometry
 */
export class BoxGeometry extends IndexedGeometry {
  constructor(
    {
      widthSegments = 1,
      heightSegments = 1,
      depthSegments = 1,
      instancesCount = 1,
      vertexBuffers = [],
    } = {} as BoxGeometryParams
  ) {
    super({ verticesOrder: 'ccw', instancesCount, vertexBuffers })

    this.type = 'BoxGeometry'

    // taken from threejs
    // https://github.com/mrdoob/three.js/blob/dev/src/geometries/BoxGeometry.js
    widthSegments = Math.floor(widthSegments)
    heightSegments = Math.floor(heightSegments)
    depthSegments = Math.floor(depthSegments)

    const vertices = []
    const uvs = []
    const normals = []
    const indices = []

    let numberOfVertices = 0

    const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
      const segmentWidth = width / gridX
      const segmentHeight = height / gridY

      const widthHalf = width / 2
      const heightHalf = height / 2
      const depthHalf = depth / 2

      const gridX1 = gridX + 1
      const gridY1 = gridY + 1

      let vertexCounter = 0

      const vector = new Vec3()

      // generate vertices, normals and uvs

      for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segmentHeight - heightHalf

        for (let ix = 0; ix < gridX1; ix++) {
          const x = ix * segmentWidth - widthHalf

          // set values to correct vector component

          vector[u] = x * udir
          vector[v] = y * vdir
          vector[w] = depthHalf

          // now apply vector to vertex buffer

          vertices.push(vector.x, vector.y, vector.z)

          // set values to correct vector component

          vector[u] = 0
          vector[v] = 0
          vector[w] = depth > 0 ? 1 : -1

          // now apply vector to normal buffer

          normals.push(vector.x, vector.y, vector.z)

          // uvs

          uvs.push(ix / gridX)
          uvs.push(iy / gridY)

          // counters

          vertexCounter += 1
        }
      }

      // indices

      // 1. you need three indices to draw a single face
      // 2. a single segment consists of two faces
      // 3. so we need to generate six (2*3) indices per segment

      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = numberOfVertices + ix + gridX1 * iy
          const b = numberOfVertices + ix + gridX1 * (iy + 1)
          const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1)
          const d = numberOfVertices + (ix + 1) + gridX1 * iy

          // faces

          indices.push(a, b, d)
          indices.push(b, c, d)

          // update total number of vertices

          numberOfVertices += vertexCounter
        }
      }
    }

    buildPlane('z', 'y', 'x', -1, -1, 2, 2, 2, depthSegments, heightSegments) // px
    buildPlane('z', 'y', 'x', 1, -1, 2, 2, -2, depthSegments, heightSegments) // nx
    buildPlane('x', 'z', 'y', 1, 1, 2, 2, 2, widthSegments, depthSegments) // py
    buildPlane('x', 'z', 'y', 1, -1, 2, 2, -2, widthSegments, depthSegments) // ny
    buildPlane('x', 'y', 'z', 1, -1, 2, 2, 2, widthSegments, heightSegments) // pz
    buildPlane('x', 'y', 'z', -1, -1, 2, 2, -2, widthSegments, heightSegments) // nz

    this.setIndexBuffer({
      array: new Uint32Array(indices),
    })

    this.setAttribute({
      name: 'position',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      size: 3,
      array: new Float32Array(vertices),
    })

    this.setAttribute({
      name: 'uv',
      type: 'vec2f',
      bufferFormat: 'float32x2',
      size: 2,
      array: new Float32Array(uvs),
    })

    this.setAttribute({
      name: 'normal',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      size: 3,
      array: new Float32Array(normals),
    })
  }
}
