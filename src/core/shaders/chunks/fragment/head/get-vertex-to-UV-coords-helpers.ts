/** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
export const getVertexToUVCoords = /* wgsl */ `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
}
`
