const getMetallicRoughness = ({
  metallicRoughnessTexture = null
} = {}) => {
  let metallicRoughness = (
    /*  wgsl */
    `
  var metallic = metallicFactor;
  var roughness = roughnessFactor;`
  );
  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */
    `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture}, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
  
  metallic = metallic * metallicRoughness.b;
  roughness = roughness * metallicRoughness.g;
  `;
  }
  metallicRoughness += /* wgsl */
  `
  metallic = saturate(metallic);
  roughness = saturate(roughness);
  `;
  return metallicRoughness;
};

export { getMetallicRoughness };
