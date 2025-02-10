const getMetallicRoughness = ({
  metallicRoughnessTexture = null
} = {}) => {
  let metallicRoughness = "";
  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */
    `
  var metallicRoughnessUV: vec2f = ${metallicRoughnessTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in metallicRoughnessTexture.texture.options && metallicRoughnessTexture.texture.options.useTransform) {
      metallicRoughness += /* wgsl */
      `
  metallicRoughnessUV = (${metallicRoughnessTexture.texture.options.name}Matrix * vec3(metallicRoughnessUV, 1.0)).xy;`;
    }
    metallicRoughness += /* wgsl */
    `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture.options.name}, ${metallicRoughnessTexture.sampler?.name ?? "defaultSampler"}, metallicRoughnessUV);
  
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
