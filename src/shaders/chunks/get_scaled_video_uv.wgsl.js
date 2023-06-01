export default /* wgsl */ `
  fn getScaledVideoUV(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {
    return (textureMatrix * vec4f(vec2f(uv.x, 1 - uv.y), 0, 1)).xy;
  }
`
