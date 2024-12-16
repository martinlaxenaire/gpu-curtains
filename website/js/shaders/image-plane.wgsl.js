export const imagePlaneVs = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  var transformed: vec3f = vec3(
      attributes.position.x,
      attributes.position.y,
      attributes.position.z - cos(3.141595 * attributes.position.y * 0.5) * deformation.strength * 2.0
  );

  vsOutput.position = getOutputPosition(transformed);
  vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);

  return vsOutput;
}
`

export const imagePlaneFs = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  var color = textureSample(planeTexture, defaultSampler, fsInput.uv);
  return vec4(color.rgb, color.a * global.opacity);
}
`
