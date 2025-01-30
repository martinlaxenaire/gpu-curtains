const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = "";
  if (transmissionTexture) {
    transmissionThickness += /* wgsl */
    `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture}, ${transmissionTexture.sampler}, ${transmissionTexture.texCoordAttributeName});
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
  }
  if (thicknessTexture) {
    transmissionThickness += /* wgsl */
    `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture}, ${thicknessTexture.sampler}, ${thicknessTexture.texCoordAttributeName});
  
  thickness *= thicknessSample.g;`;
  }
  return transmissionThickness;
};

export { getTransmissionThickness };
