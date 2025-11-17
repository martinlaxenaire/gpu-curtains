import { getTextureSample } from './get-texture-sample.mjs';

const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null
} = {}) => {
  let transmissionThickness = "";
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
  return transmissionThickness;
};

export { getTransmissionThickness };
