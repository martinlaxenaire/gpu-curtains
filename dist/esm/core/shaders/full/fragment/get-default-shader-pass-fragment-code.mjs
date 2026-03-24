//#region src/core/shaders/full/fragment/get-default-shader-pass-fragment-code.ts
/** Default fragment shader code to use with {@link core/renderPasses/ShaderPass.ShaderPass | ShaderPass} that outputs the content of the pass `renderTexture` as is. */
const getDefaultShaderPassFragmentCode = `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(renderTexture, defaultSampler, fsInput.uv);
}`;
//#endregion
export { getDefaultShaderPassFragmentCode };
