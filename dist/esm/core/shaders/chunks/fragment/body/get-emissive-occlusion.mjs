const getEmissiveOcclusion = ({
  emissiveTexture = null,
  occlusionTexture = null
} = {}) => {
  let emissiveOcclusion = (
    /* wgsl */
    `
  var occlusion: f32 = 1.0;`
  );
  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */
    `
  var emissiveUV: vec2f = ${emissiveTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in emissiveTexture.texture.options && emissiveTexture.texture.options.useTransform) {
      emissiveOcclusion += /* wgsl */
      `
  emissiveUV = (${emissiveTexture.texture.options.name}Matrix * vec3(emissiveUV, 1.0)).xy;`;
    }
    emissiveOcclusion += /* wgsl */
    `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture.options.name}, ${emissiveTexture.sampler?.name ?? "defaultSampler"}, emissiveUV).rgb;
  emissive *= emissiveSample;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  emissive *= emissiveStrength;`;
  if (occlusionTexture) {
    emissiveOcclusion += /* wgsl */
    `
  var occlusionUV: vec2f = ${occlusionTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in occlusionTexture.texture.options && occlusionTexture.texture.options.useTransform) {
      emissiveOcclusion += /* wgsl */
      `
  occlusionUV = (${occlusionTexture.texture.options.name}Matrix * vec3(occlusionUV, 1.0)).xy;`;
    }
    emissiveOcclusion += /* wgsl */
    `
  occlusion = textureSample(${occlusionTexture.texture.options.name}, ${occlusionTexture.sampler?.name ?? "defaultSampler"}, occlusionUV).r;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  occlusion = 1.0 + occlusionIntensity * (occlusion - 1.0);`;
  return emissiveOcclusion;
};

export { getEmissiveOcclusion };
