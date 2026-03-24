//#region src/core/shaders/chunks/fragment/head/get-vertex-to-UV-coords-helpers.ts
/** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
const getVertexToUVCoords = `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
}
`;
//#endregion
export { getVertexToUVCoords };
