declare const _default: "\nstruct VertexOutput {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n};\n\n@vertex fn main(\n  attributes: Attributes,\n) -> VertexOutput {\n  var vsOutput: VertexOutput;\n\n  vsOutput.position = vec4f(attributes.position, 1.0);\n  vsOutput.uv = attributes.uv;\n  \n  return vsOutput;\n}";
export default _default;
