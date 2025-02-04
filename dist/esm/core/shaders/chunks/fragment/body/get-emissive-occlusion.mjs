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
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture.options.name}, ${emissiveTexture.sampler?.name ?? "defaultSampler"}, ${emissiveTexture.texCoordAttributeName ?? "uv"}).rgb;
  emissive *= emissiveSample;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  emissive *= emissiveStrength;`;
  if (occlusionTexture) {
    emissiveOcclusion += /* wgsl */
    `
  occlusion = textureSample(${occlusionTexture.texture.options.name}, ${occlusionTexture.sampler?.name ?? "defaultSampler"}, ${occlusionTexture.texCoordAttributeName ?? "uv"}).r;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  occlusion = 1.0 + occlusionIntensity * (occlusion - 1.0);`;
  return emissiveOcclusion;
};

export { getEmissiveOcclusion };
