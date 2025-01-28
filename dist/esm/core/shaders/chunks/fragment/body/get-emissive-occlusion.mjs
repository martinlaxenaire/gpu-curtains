const getEmissiveOcclusion = ({
  emissiveTexture = null,
  occlusionTexture = null
} = {}) => {
  let emissiveOcclusion = (
    /* wgsl */
    `
  var emissive: vec3f = emissiveFactor;
  var occlusion: f32 = 1.0;`
  );
  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */
    `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture}, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
  emissive *= emissiveSample;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  emissive *= emissiveStrength;`;
  if (occlusionTexture) {
    emissiveOcclusion += /* wgsl */
    `
  occlusion = textureSample(${occlusionTexture.texture}, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;`;
  }
  emissiveOcclusion += /* wgsl */
  `
  occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);`;
  return emissiveOcclusion;
};

export { getEmissiveOcclusion };
