const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = (
    /* wgsl */
    `
  var transmission: f32 = transmissionFactor;
  var thickness: f32 = thicknessFactor;`
  );
  if (transmissionTexture) {
    transmissionThickness += /* wgsl */
    `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture}, ${transmissionTexture.sampler}, fsInput.${transmissionTexture.texCoordAttributeName});
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
  }
  if (thicknessTexture) {
    transmissionThickness += /* wgsl */
    `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture}, ${thicknessTexture.sampler}, fsInput.${thicknessTexture.texCoordAttributeName});
  
  thickness = thickness * thicknessSample.g;`;
  }
  return transmissionThickness;
};

export { getTransmissionThickness };
