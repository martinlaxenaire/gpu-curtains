const getSpecular = ({
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null
} = {}) => {
  let specular = "";
  if (specularTexture) {
    specular += /* wgsl */
    `
  let specularSample: vec4f = textureSample(${specularTexture.texture.options.name}, ${specularTexture.sampler?.name ?? "defaultSampler"}, ${specularTexture.texCoordAttributeName ?? "uv"});
  
  specularIntensity = specularIntensity * specularSample.a;
  specularColor = specularColor * specularSample.rgb;`;
  } else {
    if (specularFactorTexture) {
      specular += /* wgsl */
      `
  let specularFactorSample: vec4f = textureSample(${specularFactorTexture.texture.options.name}, ${specularFactorTexture.sampler?.name ?? "defaultSampler"}, ${specularFactorTexture.texCoordAttributeName ?? "uv"});
  
  specularIntensity = specularIntensity * specularSample.a;`;
    }
    if (specularColorTexture) {
      specular += /* wgsl */
      `
  let specularColorSample: vec4f = textureSample(${specularColorTexture.texture.options.name}, ${specularColorTexture.sampler?.name ?? "defaultSampler"}, ${specularColorTexture.texCoordAttributeName ?? "uv"});
  
  specularColor = specularColor * specularSample.rgb;`;
    }
  }
  return specular;
};

export { getSpecular };
