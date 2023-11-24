declare const _default: "\nfn getUVCover(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {\n  return (textureMatrix * vec4f(uv, 0, 1)).xy;\n}";
export default _default;
