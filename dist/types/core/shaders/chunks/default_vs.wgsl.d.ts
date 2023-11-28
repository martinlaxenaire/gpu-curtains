declare const _default: "\nstruct VertexOutput {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n};\n\n@vertex fn main(\n  attributes: Attributes,\n) -> VertexOutput {\n  var vertexOutput: VertexOutput;\n\n  vertexOutput.position = vec4f(attributes.position, 1.0);\n  vertexOutput.uv = attributes.uv;\n  \n  return vertexOutput;\n}";
export default _default;
