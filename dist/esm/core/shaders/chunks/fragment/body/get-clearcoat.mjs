import { getTextureSample } from './get-texture-sample.mjs';

const getClearcoat = ({
  extensionsUsed = [],
  clearcoatTexture = null,
  clearcoatRoughnessTexture = null
}) => {
  let clearcoat = (
    /* wgsl */
    `
  var clearcoatF0: vec3f = vec3( 0.04 );
  var clearcoatF90: f32 = 1.0;
  
  var clearcoatSpecularDirect: vec3f = vec3( 0.0 );
  var clearcoatSpecularIndirect: vec3f = vec3( 0.0 );`
  );
  if (!extensionsUsed.includes("KHR_materials_clearcoat")) {
    return clearcoat;
  }
  if (clearcoatTexture) {
    clearcoat += /* wgsl */
    `
  var clearcoatUV: vec2f = ${clearcoatTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in clearcoatTexture.texture.options && clearcoatTexture.texture.options.useTransform) {
      clearcoat += /* wgsl */
      `
  clearcoatUV = (texturesMatrices.${clearcoatTexture.texture.options.name}.matrix * vec3(clearcoatUV, 1.0)).xy;`;
    }
    clearcoat += /* wgsl */
    `
  let clearcoatSample: vec4f = textureSample(${clearcoatTexture.texture.options.name}, ${clearcoatTexture.sampler?.name ?? "defaultSampler"}, clearcoatUV);

  clearcoat = clearcoat * clearcoatSample.r;
    `;
  }
  if (clearcoatRoughnessTexture) {
    clearcoat += /* wgsl */
    `
  var clearcoatRoughnessUV: vec2f = ${clearcoatRoughnessTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in clearcoatRoughnessTexture.texture.options && clearcoatRoughnessTexture.texture.options.useTransform) {
      clearcoat += /* wgsl */
      `
  clearcoatRoughnessUV = (texturesMatrices.${clearcoatRoughnessTexture.texture.options.name}.matrix * vec3(clearcoatRoughnessUV, 1.0)).xy;`;
    }
    clearcoat += /* wgsl */
    `
  let clearcoatRoughnessSample: vec4f = textureSample(${clearcoatRoughnessTexture.texture.options.name}, ${clearcoatRoughnessTexture.sampler?.name ?? "defaultSampler"}, clearcoatRoughnessUV);

  clearcoatRoughness = clearcoatRoughness * clearcoatRoughnessSample.g;
    `;
  }
  clearcoat += /* wgsl */
  `
  clearcoatRoughness = clamp(clearcoatRoughness, 0.0525, 1.0);
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
