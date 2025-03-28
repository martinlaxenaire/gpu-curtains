const getDefaultNormalFragmentCode = (
  /* wgsl */
  `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  // normals
  return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
}`
);

export { getDefaultNormalFragmentCode };
