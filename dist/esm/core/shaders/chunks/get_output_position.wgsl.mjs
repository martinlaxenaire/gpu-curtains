var get_output_position = (
  /* wgsl */
  `
fn getOutputPosition(position: vec3f) -> vec4f {
  return camera.projection * matrices.modelView * vec4f(position, 1.0);
}`
);

export { get_output_position as default };
