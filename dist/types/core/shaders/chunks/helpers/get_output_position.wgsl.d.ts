declare const _default: "\nfn getWorldPosition(position: vec3f) -> vec4f {\n  return matrices.model * vec4f(position, 1.0);\n}\n\nfn getOutputPosition(position: vec3f) -> vec4f {\n  return camera.projection * matrices.modelView * vec4f(position, 1.0);\n}";
export default _default;
