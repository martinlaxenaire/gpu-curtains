import { getTextureSample } from './get-texture-sample.mjs';

const getDiffuseTransmission = ({
  extensionsUsed = [],
  diffuseTransmissionTexture = null,
  diffuseTransmissionFactorTexture = null,
  diffuseTransmissionColorTexture = null
}) => {
  let diffuseTransmission = (
    /* wgsl */
    `
  var diffuseTransmissionContribution: vec3f = vec3(1.0);
  var diffuseTransmissionThickness: f32 = 1.0;`
  );
  if (!extensionsUsed.includes("KHR_materials_diffuse_transmission")) {
    return diffuseTransmission;
  }
  if (diffuseTransmissionTexture) {
    diffuseTransmission += getTextureSample(diffuseTransmissionTexture, "diffuseTransmission");
    diffuseTransmission += /* wgsl */
    `
  diffuseTransmission = diffuseTransmission * diffuseTransmissionSample.a;
  diffuseTransmissionColor = diffuseTransmissionColor * diffuseTransmissionSample.rgb;
      `;
  } else {
    if (diffuseTransmissionFactorTexture) {
      diffuseTransmission += getTextureSample(diffuseTransmissionFactorTexture, "diffuseTransmissionFactor");
      diffuseTransmission += /* wgsl */
      `
  diffuseTransmission = diffuseTransmission * diffuseTransmissionFactorSample.a;
      `;
    }
    if (diffuseTransmissionColorTexture) {
      diffuseTransmission += getTextureSample(diffuseTransmissionColorTexture, "diffuseTransmissionColor");
      diffuseTransmission += /* wgsl */
      `
  diffuseTransmissionColor = diffuseTransmissionColor * diffuseTransmissionColorSample.rgb;
      `;
    }
  }
  diffuseTransmission += /* wgsl */
  `
  diffuseTransmissionContribution = diffuseTransmissionColor * (1.0 - metallic);`;
  if (extensionsUsed.includes("KHR_materials_volume")) {
    diffuseTransmission += /* wgsl */
    `
  diffuseTransmissionThickness = thickness * (modelScale.x + modelScale.y + modelScale.z) / 3.0;`;
  }
  return diffuseTransmission;
};

export { getDiffuseTransmission };
