export default /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VertexOutput {
  var vsOutput: VertexOutput;

  vsOutput.position = getOutputPosition(attributes.position);
  vsOutput.uv = attributes.uv;
  vsOutput.normal = normalize(matrices.normal * attributes.normal);
  
  return vsOutput;
}`
