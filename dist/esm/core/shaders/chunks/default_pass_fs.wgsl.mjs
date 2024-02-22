var default_pass_fsWGSl = (
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

export { default_pass_fsWGSl as default };
//# sourceMappingURL=default_pass_fs.wgsl.mjs.map
