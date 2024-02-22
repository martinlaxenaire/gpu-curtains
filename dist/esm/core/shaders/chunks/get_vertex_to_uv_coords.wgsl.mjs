var get_vertex_to_uv_coords = (
  /* wgsl */
  `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}
`
);

export { get_vertex_to_uv_coords as default };
//# sourceMappingURL=get_vertex_to_uv_coords.wgsl.mjs.map
