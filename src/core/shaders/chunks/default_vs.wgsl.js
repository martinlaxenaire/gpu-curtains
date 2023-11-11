export default /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VertexOutput {
  var vertexOutput: VertexOutput;

  vertexOutput.position = vec4f(attributes.position, 1.0);
  vertexOutput.uv = attributes.uv;
  
  return vertexOutput;
}`
