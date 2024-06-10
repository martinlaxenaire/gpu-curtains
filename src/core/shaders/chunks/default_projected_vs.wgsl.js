export default /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = getOutputPosition(attributes.position);
  vsOutput.uv = attributes.uv;
  vsOutput.normal = getWorldNormal(attributes.normal);
  
  return vsOutput;
}`
