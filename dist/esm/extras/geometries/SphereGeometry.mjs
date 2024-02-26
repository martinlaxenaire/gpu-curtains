import { IndexedGeometry } from '../../core/geometries/IndexedGeometry.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

class SphereGeometry extends IndexedGeometry {
  constructor({
    widthSegments = 32,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaStart = 0,
    thetaLength = Math.PI,
    instancesCount = 1,
    vertexBuffers = [],
    topology
  } = {}) {
    super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers });
    this.type = "SphereGeometry";
    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));
    const radius = 1;
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    let index = 0;
    const grid = [];
    const vertex = new Vec3();
    const normal = new Vec3();
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = [];
      const v = iy / heightSegments;
      let uOffset = 0;
      if (iy === 0 && thetaStart === 0) {
        uOffset = 0.5 / widthSegments;
      } else if (iy === heightSegments && thetaEnd === Math.PI) {
        uOffset = -0.5 / widthSegments;
      }
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertices.push(vertex.x, vertex.y, vertex.z);
        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u + uOffset, v);
        verticesRow.push(index++);
      }
      grid.push(verticesRow);
    }
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];
        if (iy !== 0 || thetaStart > 0)
          indices.push(a, b, d);
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI)
          indices.push(b, c, d);
      }
    }
    this.setAttribute({
      name: "position",
      type: "vec3f",
      bufferFormat: "float32x3",
      size: 3,
      array: new Float32Array(vertices)
    });
    this.setAttribute({
      name: "uv",
      type: "vec2f",
      bufferFormat: "float32x2",
      size: 2,
      array: new Float32Array(uvs)
    });
    this.setAttribute({
      name: "normal",
      type: "vec3f",
      bufferFormat: "float32x3",
      size: 3,
      array: new Float32Array(normals)
    });
    this.setIndexBuffer({
      array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
      bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
    });
  }
}

export { SphereGeometry };
