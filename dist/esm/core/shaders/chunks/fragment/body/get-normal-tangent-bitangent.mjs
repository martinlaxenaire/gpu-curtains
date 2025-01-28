const getNormalTangentBitangent = ({
  geometry = null,
  normalTexture = null
} = {}) => {
  let normalTangentBitangent = (
    /* wgsl */
    `
  let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;
  var tangent: vec3f;
  var bitangent: vec3f;`
  );
  const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
  const hasTangent = !!(normalTexture && tangentAttribute);
  if (normalTexture) {
    if (hasTangent) {
      normalTangentBitangent += /* wgsl */
      `
  tangent = normalize(fsInput.tangent.xyz);
  bitangent = normalize(fsInput.bitangent);
  `;
    } else {
      normalTangentBitangent += /* wgsl */
      `
  let Q1: vec3f = dpdx(worldPosition);
  let Q2: vec3f = dpdy(worldPosition);
  let st1: vec2f = dpdx(fsInput.${normalTexture.texCoordAttributeName});
  let st2: vec2f = dpdy(fsInput.${normalTexture.texCoordAttributeName});
  
  tangent = normalize(Q1 * st2.y - Q2 * st1.y);
  bitangent = normalize(-Q1 * st2.x + Q2 * st1.x);
  `;
    }
    normalTangentBitangent += /* wgsl */
    `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);
  let normalMap = textureSample(${normalTexture.texture}, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(normalMapScale, normalMapScale, 1.0)));`;
  } else {
    normalTangentBitangent += /* wgsl */
    `
  normal = geometryNormal;`;
  }
  return normalTangentBitangent;
};

export { getNormalTangentBitangent };
