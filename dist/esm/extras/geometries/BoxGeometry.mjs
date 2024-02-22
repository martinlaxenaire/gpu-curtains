import { IndexedGeometry } from '../../core/geometries/IndexedGeometry.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

class BoxGeometry extends IndexedGeometry {
  constructor({
    widthSegments = 1,
    heightSegments = 1,
    depthSegments = 1,
    instancesCount = 1,
    vertexBuffers = [],
    topology
  } = {}) {
    super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers });
    this.type = "BoxGeometry";
    widthSegments = Math.floor(widthSegments);
    heightSegments = Math.floor(heightSegments);
    depthSegments = Math.floor(depthSegments);
    const vertices = [];
    const uvs = [];
    const normals = [];
    const indices = [];
    let numberOfVertices = 0;
    const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
      const segmentWidth = width / gridX;
      const segmentHeight = height / gridY;
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      const depthHalf = depth / 2;
      const gridX1 = gridX + 1;
      const gridY1 = gridY + 1;
      let vertexCounter = 0;
      const vector = new Vec3();
      for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segmentHeight - heightHalf;
        for (let ix = 0; ix < gridX1; ix++) {
          const x = ix * segmentWidth - widthHalf;
          vector[u] = x * udir;
          vector[v] = y * vdir;
          vector[w] = depthHalf;
          vertices.push(vector.x, vector.y, vector.z);
          vector[u] = 0;
          vector[v] = 0;
          vector[w] = depth > 0 ? 1 : -1;
          normals.push(vector.x, vector.y, vector.z);
          uvs.push(ix / gridX);
          uvs.push(iy / gridY);
          vertexCounter += 1;
        }
      }
      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = numberOfVertices + ix + gridX1 * iy;
          const b = numberOfVertices + ix + gridX1 * (iy + 1);
          const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
          const d = numberOfVertices + (ix + 1) + gridX1 * iy;
          indices.push(a, b, d);
          indices.push(b, c, d);
          numberOfVertices += vertexCounter;
        }
      }
    };
    buildPlane("z", "y", "x", -1, -1, 2, 2, 2, depthSegments, heightSegments);
    buildPlane("z", "y", "x", 1, -1, 2, 2, -2, depthSegments, heightSegments);
    buildPlane("x", "z", "y", 1, 1, 2, 2, 2, widthSegments, depthSegments);
    buildPlane("x", "z", "y", 1, -1, 2, 2, -2, widthSegments, depthSegments);
    buildPlane("x", "y", "z", 1, -1, 2, 2, 2, widthSegments, heightSegments);
    buildPlane("x", "y", "z", -1, -1, 2, 2, -2, widthSegments, heightSegments);
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

export { BoxGeometry };
//# sourceMappingURL=BoxGeometry.mjs.map
