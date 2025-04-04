/** Get output `position` (`vec4f`) vector by applying model view projection matrix to the attribute `position` (`vec3f`) vector. */
export const getPositionHelpers = /* wgsl */ `
fn getWorldPosition(position: vec3f) -> vec4f {
  return matrices.model * vec4f(position, 1.0);
}

fn getOutputPosition(position: vec3f) -> vec4f {
  return camera.projection * camera.view * matrices.model * vec4f(position, 1.0);
}`
