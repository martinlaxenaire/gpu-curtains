/** Default vertex shader code for unprojected meshes (such as {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane} or {@link core/renderPasses/ShaderPass.ShaderPass | ShaderPass}). */
export const getDefaultVertexShaderCode = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = vec4f(attributes.position, 1.0);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`
