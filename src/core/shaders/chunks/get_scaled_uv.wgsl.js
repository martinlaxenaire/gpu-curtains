export default /* wgsl */ `
fn getScaledUV(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {
  return (textureMatrix * vec4f(uv, 0, 1)).xy;
}`
