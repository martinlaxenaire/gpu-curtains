import { getTextureSample } from './get-texture-sample.mjs';

const getNormal = ({
  normalTexture = null
} = {}) => {
  let normal = "";
  if (normalTexture) {
    normal += getTextureSample(normalTexture, "normal");
    normal += /* wgsl */
    `
  var mapN: vec3f = normalSample.rgb * 2.0 - 1.0;
  mapN = vec3(mapN.x * normalScale.x, mapN.y * normalScale.y, mapN.z);
  normal = normalize(tbn * mapN);
  `;
  } else {
    normal += /* wgsl */
    `
  normal = geometryNormal;`;
  }
  return normal;
};

export { getNormal };
