const getPositionHelpers = (
  /* wgsl */
  `
fn getWorldPosition(position: vec3f) -> vec4f {
  return matrices.model * vec4f(position, 1.0);
}

fn getOutputPosition(position: vec3f) -> vec4f {
  return camera.projection * camera.view * matrices.model * vec4f(position, 1.0);
}`
);

export { getPositionHelpers };
