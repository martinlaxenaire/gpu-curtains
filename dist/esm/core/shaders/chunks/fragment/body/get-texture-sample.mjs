const getTextureSample = (texture, textureName = "texture") => {
  let sample = "";
  if (!texture) return sample;
  sample += /* wgsl */
  `
  var ${textureName}UV: vec2f = ${texture.texCoordAttributeName ?? "uv"};`;
  if ("useTransform" in texture.texture.options && texture.texture.options.useTransform) {
    sample += /* wgsl */
    `
  ${textureName}UV = (texturesMatrices.${texture.texture.options.name}.matrix * vec3(${textureName}UV, 1.0)).xy;`;
  }
  sample += /* wgsl */
  `
  let ${textureName}Sample: vec4f = textureSample(${texture.texture.options.name}, ${texture.sampler?.name ?? "defaultSampler"}, ${textureName}UV);`;
  return sample;
};

export { getTextureSample };
