/** Get `normal` (`vec3f`) in world or view space. */
export const getNormalHelpers = /* wgsl */ `
fn getWorldNormal(normal: vec3f) -> vec3f {
  return normalize(matrices.normal * normal);
}

fn getViewNormal(normal: vec3f) -> vec3f {
  return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
}`
