const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = "";
  if (transmissionTexture) {
    transmissionThickness += /* wgsl */
    `
  var transmissionUV: vec2f = ${transmissionTexture.texCoordAttributeName ?? "uv"};`;
    if (transmissionTexture.texture.options.useTransform) {
      transmissionThickness += /* wgsl */
      `
  transmissionUV = (${transmissionTexture.texture.options.name}Matrix * vec3(transmissionUV, 1.0)).xy;`;
    }
    transmissionThickness += /* wgsl */
    `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture.options.name}, ${transmissionTexture.sampler?.name ?? "defaultSampler"}, transmissionUV);
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
  }
  if (thicknessTexture) {
    transmissionThickness += /* wgsl */
    `
  var thicknessUV: vec2f = ${thicknessTexture.texCoordAttributeName ?? "uv"};`;
    if (thicknessTexture.texture.options.useTransform) {
      transmissionThickness += /* wgsl */
      `
  thicknessUV = (${thicknessTexture.texture.options.name}Matrix * vec3(thicknessUV, 1.0)).xy;`;
    }
    transmissionThickness += /* wgsl */
    `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture.options.name}, ${thicknessTexture.sampler?.name ?? "defaultSampler"}, thicknessUV);
  
  thickness *= thicknessSample.g;`;
  }
  return transmissionThickness;
};

export { getTransmissionThickness };
