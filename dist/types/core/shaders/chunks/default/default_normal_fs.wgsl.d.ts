declare const _default: "\nstruct VSOutput {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n  @location(1) normal: vec3f,\n};\n\n@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {\n  // normals\n  return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);\n}";
export default _default;
