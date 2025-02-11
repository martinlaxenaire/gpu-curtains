const getUVCover = (
  /* wgsl */
  `
fn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {
  return (textureMatrix * vec3f(uv, 1.0)).xy;
}`
);

export { getUVCover };
