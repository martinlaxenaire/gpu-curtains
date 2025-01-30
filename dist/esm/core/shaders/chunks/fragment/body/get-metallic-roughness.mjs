const getMetallicRoughness = ({
  metallicRoughnessTexture = null
} = {}) => {
  let metallicRoughness = "";
  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */
    `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture}, ${metallicRoughnessTexture.sampler}, ${metallicRoughnessTexture.texCoordAttributeName});
  
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
