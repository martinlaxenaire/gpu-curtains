declare const _default: "\nfn getOutputPosition(position: vec3f) -> vec4f {\n  return matrices.modelViewProjection * vec4f(position, 1.0);\n}";
export default _default;
