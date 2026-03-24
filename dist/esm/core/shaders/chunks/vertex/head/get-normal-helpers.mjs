//#region src/core/shaders/chunks/vertex/head/get-normal-helpers.ts
/** Get `normal` (`vec3f`) in world or view space. */
const getNormalHelpers = `
fn getWorldNormal(normal: vec3f) -> vec3f {
  return normalize(matrices.normal * normal);
}

fn getViewNormal(normal: vec3f) -> vec3f {
  return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
}`;
//#endregion
export { getNormalHelpers };
