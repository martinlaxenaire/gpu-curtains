//#region src/core/shaders/chunks/fragment/head/get-uv-cover-helper.ts
/** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
const getUVCover = `
fn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {
  return (textureMatrix * vec3f(uv, 1.0)).xy;
}`;
//#endregion
export { getUVCover };
