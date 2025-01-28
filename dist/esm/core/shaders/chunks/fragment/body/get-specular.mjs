const getSpecular = ({
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null
} = {}) => {
  let specular = "";
  if (specularTexture) {
    specular += /* wgsl */
    `
  let specularSample: vec4f = textureSample(${specularTexture.texture}, ${specularTexture.sampler}, fsInput.${specularTexture.texCoordAttributeName});
  
  specularFactor = specularFactor * specularSample.a;
  specularColorFactor = specularColorFactor * specularSample.rgb;`;
  } else {
    if (specularFactorTexture) {
      specular += /* wgsl */
      `
  let specularFactorSample: vec4f = textureSample(${specularFactorTexture.texture}, ${specularFactorTexture.sampler}, fsInput.${specularFactorTexture.texCoordAttributeName});
  
  specularFactor = specularFactor * specularSample.a;`;
    }
    if (specularColorTexture) {
      specular += /* wgsl */
      `
  let specularColorSample: vec4f = textureSample(${specularColorTexture.texture}, ${specularColorTexture.sampler}, fsInput.${specularColorTexture.texCoordAttributeName});
  
  specularColorFactor = specularColorFactor * specularSample.rgb;`;
    }
    specular += /* wgsl */
    `
  specularFactor = mix(specularFactor, 1.0, metallic);`;
  }
  return specular;
};

export { getSpecular };
