import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Vec3 } from '../../math/Vec3'
import { GeometryBaseParams } from '../../types/Geometries'

/**
 * Parameters used to create a {@link SphereGeometry}
 */
interface SphereGeometryParams extends GeometryBaseParams {
  /** Number of horizontal segments */
  widthSegments?: number
  /** Number of vertical segments */
  heightSegments?: number
  /** Horizontal starting angle */
  phiStart?: number
  /** Horizontal sweep angle size */
  phiLength?: number
  /** Vertical starting angle */
  thetaStart?: number
  /** Vertical sweep angle size */
  thetaLength?: number
}

/**
 * SphereGeometry class:
 * Helper to easily create 3D sphere indexed geometries.
 * @extends IndexedGeometry
 */
export class SphereGeometry extends IndexedGeometry {
  constructor(
    {
      widthSegments = 32,
      heightSegments = 16,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI,
      instancesCount = 1,
      vertexBuffers = [],
      topology,
    } = {} as SphereGeometryParams
  ) {
    super({ verticesOrder: 'ccw', topology, instancesCount, vertexBuffers })

    this.type = 'SphereGeometry'

    // taken from threejs
    // https://github.com/mrdoob/three.js/blob/dev/src/geometries/SphereGeometry.js
    widthSegments = Math.max(3, Math.floor(widthSegments))
    heightSegments = Math.max(2, Math.floor(heightSegments))

    const radius = 1
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI)

    let index = 0
    const grid = []

    const vertex = new Vec3()
    const normal = new Vec3()

    // buffers

    const indices = []
    const vertices = []
    const normals = []
    const uvs = []

    // generate vertices, normals and uvs

    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = []

      const v = iy / heightSegments

      // special case for the poles

      let uOffset = 0

      if (iy === 0 && thetaStart === 0) {
        uOffset = 0.5 / widthSegments
      } else if (iy === heightSegments && thetaEnd === Math.PI) {
        uOffset = -0.5 / widthSegments
      }

      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments

        // vertex

        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength)
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)

        vertices.push(vertex.x, vertex.y, vertex.z)

        // normal

        normal.copy(vertex).normalize()
        normals.push(normal.x, normal.y, normal.z)

        // uv

        uvs.push(u + uOffset, v)

        verticesRow.push(index++)
      }

      grid.push(verticesRow)
    }

    // indices

    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1]
        const b = grid[iy][ix]
        const c = grid[iy + 1][ix]
        const d = grid[iy + 1][ix + 1]

        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d)
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d)
      }
    }

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

    this.setIndexBuffer({
      array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
      bufferFormat: this.useUint16IndexArray ? 'uint16' : 'uint32',
    })
  }
}
