const getMetallicRoughness = ({
  metallicRoughnessTexture = null
} = {}) => {
  let metallicRoughness = "";
  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */
    `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture.options.name}, ${metallicRoughnessTexture.sampler?.name ?? "defaultSampler"}, ${metallicRoughnessTexture.texCoordAttributeName ?? "uv"});
  
  metallic = metallic * metallicRoughness.b;
  roughness = roughness * metallicRoughness.g;
  `;
  }
  metallicRoughness += /* wgsl */
  `
  metallic = saturate(metallic);
  roughness = clamp(roughness, 0.0525, 1.0);
  `;
  return metallicRoughness;
};

export { getMetallicRoughness };
