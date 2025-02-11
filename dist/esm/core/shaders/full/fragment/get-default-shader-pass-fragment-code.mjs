const getDefaultShaderPassFragmentCode = (
  /* wgsl */
  `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(renderTexture, defaultSampler, fsInput.uv);
}`
);

export { getDefaultShaderPassFragmentCode };
