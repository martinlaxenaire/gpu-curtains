export default /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VertexOutput {
  var vsOutput: VertexOutput;

  vsOutput.position = vec4f(attributes.position, 1.0);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`
