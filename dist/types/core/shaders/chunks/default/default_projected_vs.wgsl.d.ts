declare const _default: "\nstruct VSOutput {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n  @location(1) normal: vec3f,\n  @location(2) worldPosition: vec3f,\n  @location(3) viewDirection: vec3f,\n};\n\n@vertex fn main(\n  attributes: Attributes,\n) -> VSOutput {\n  var vsOutput: VSOutput;\n\n  vsOutput.position = getOutputPosition(attributes.position);\n  vsOutput.uv = attributes.uv;\n  vsOutput.normal = getWorldNormal(attributes.normal);\n  vsOutput.worldPosition = getWorldPosition(attributes.position).xyz;\n  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;\n  \n  return vsOutput;\n}";
export default _default;