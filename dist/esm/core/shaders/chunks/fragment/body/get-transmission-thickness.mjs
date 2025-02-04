const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = "";
  if (transmissionTexture) {
    transmissionThickness += /* wgsl */
    `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture.options.name}, ${transmissionTexture.sampler?.name ?? "defaultSampler"}, ${transmissionTexture.texCoordAttributeName ?? "uv"});
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
  }
  if (thicknessTexture) {
    transmissionThickness += /* wgsl */
    `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture.options.name}, ${thicknessTexture.sampler?.name ?? "defaultSampler"}, ${thicknessTexture.texCoordAttributeName ?? "uv"});
  
  thickness *= thicknessSample.g;`;
  }
  return transmissionThickness;
};

export { getTransmissionThickness };
