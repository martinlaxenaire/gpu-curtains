declare const _default: "\nfn getWorldNormal(normal: vec3f) -> vec3f {\n  return normalize(matrices.normal * normal);\n}\n\nfn getViewNormal(normal: vec3f) -> vec3f {\n  return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);\n}";
export default _default;
