import { getTextureSample } from './get-texture-sample.mjs';

const getTransmissionThickness = ({
  transmissionThicknessTexture = null,
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = "";
  if (transmissionThicknessTexture) {
    transmissionThickness += getTextureSample(transmissionThicknessTexture, "transmissionThickness");
    transmissionThickness += /* wgsl */
    `
    transmission = clamp(transmission * transmissionThicknessSample.r, 0.0, 1.0);
    thickness *= transmissionThicknessSample.g;`;
  } else {
    if (transmissionTexture) {
      transmissionThickness += getTextureSample(transmissionTexture, "transmission");
      transmissionThickness += /* wgsl */
      `
    transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
    }
    if (thicknessTexture) {
      transmissionThickness += getTextureSample(thicknessTexture, "thickness");
      transmissionThickness += /* wgsl */
      `
  thickness *= thicknessSample.g;`;
    }
  }
  return transmissionThickness;
};

export { getTransmissionThickness };
