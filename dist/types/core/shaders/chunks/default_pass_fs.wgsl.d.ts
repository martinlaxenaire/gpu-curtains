declare const _default: "\nstruct VSOutput {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n};\n\n@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {\n  return textureSample(renderTexture, defaultSampler, fsInput.uv);\n}";
export default _default;
