import { getTextureSample } from './get-texture-sample.mjs';

const getClearcoat = ({
  extensionsUsed = [],
  clearcoatTexture = null,
  clearcoatFactorTexture = null,
  clearcoatRoughnessTexture = null
}) => {
  let clearcoat = (
    /* wgsl */
    `
  var clearcoatF0: vec3f = vec3(pow((ior - 1.0) / (ior + 1.0), 2.0));
  var clearcoatF90: f32 = 1.0;
  
  var clearcoatSpecularDirect: vec3f = vec3( 0.0 );
  var clearcoatSpecularIndirect: vec3f = vec3( 0.0 );`
  );
  if (!extensionsUsed.includes("KHR_materials_clearcoat")) {
    return clearcoat;
  }
  if (clearcoatTexture) {
    clearcoat += getTextureSample(clearcoatTexture, "clearcoat");
    clearcoat += /* wgsl */
    `
  clearcoat = clearcoat * clearcoatSample.r;
  clearcoatRoughness = clearcoatRoughness * clearcoatSample.g;
    `;
  } else {
    if (clearcoatFactorTexture) {
      clearcoat += getTextureSample(clearcoatFactorTexture, "clearcoatFactor");
      clearcoat += /* wgsl */
      `
  clearcoat = clearcoat * clearcoatFactorSample.r;
    `;
    }
    if (clearcoatRoughnessTexture) {
      clearcoat += getTextureSample(clearcoatRoughnessTexture, "clearcoatRoughness");
      clearcoat += /* wgsl */
      `
  clearcoatRoughness = clearcoatRoughness * clearcoatRoughnessSample.g;
    `;
    }
  }
  clearcoat += /* wgsl */
  `
  clearcoatRoughness = max( clearcoatRoughness, 0.0525 );
  clearcoatRoughness += geometryRoughness;
  clearcoatRoughness = min( clearcoatRoughness, 1.0 );
  `;
  return clearcoat;
};
const getClearcoatNormal = ({
  extensionsUsed = [],
  normalTexture = null,
  clearcoatNormalTexture = null
}) => {
  let clearcoatNormal = (
    /* wgsl */
    `
  var clearcoatNormal: vec3f = geometryNormal;`
  );
  if (!extensionsUsed.includes("KHR_materials_clearcoat")) {
    return clearcoatNormal;
  }
  if (clearcoatNormalTexture) {
    if (normalTexture) {
      clearcoatNormal += /* wgsl */
      `
    let clearcoatNormalSample = textureSample(${clearcoatNormalTexture.texture.options.name}, ${clearcoatNormalTexture.sampler?.name ?? "defaultSampler"}, normalUV);`;
    } else {
      clearcoatNormal += getTextureSample(clearcoatNormalTexture, "clearcoatNormal");
    }
    clearcoatNormal += /* wgsl */
    `
  var clearcoatMapN: vec3f = clearcoatNormalSample.rgb * 2.0 - 1.0;
  clearcoatMapN = vec3(clearcoatMapN.x * clearcoatNormalScale.x, clearcoatMapN.y * clearcoatNormalScale.y, clearcoatMapN.z);
  clearcoatNormal = normalize(tbn * clearcoatMapN);
  `;
  }
  return clearcoatNormal;
};

export { getClearcoat, getClearcoatNormal };
