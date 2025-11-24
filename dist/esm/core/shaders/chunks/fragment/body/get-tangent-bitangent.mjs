const getTangentBitangent = ({
  extensionsUsed = [],
  geometry = null,
  normalTexture = null,
  clearcoatNormalTexture = null
} = {}) => {
  let tangentBitangent = (
    /* wgsl */
    `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;`
  );
  const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
  const needsTangentBitangent = !!normalTexture || !!clearcoatNormalTexture || extensionsUsed.includes("KHR_materials_anisotropy");
  if (needsTangentBitangent) {
    if (tangentAttribute) {
      tangentBitangent += /* wgsl */
      `
  let tbn = mat3x3f(normalize(tangent), normalize(bitangent), geometryNormal);`;
    } else {
      if (normalTexture) {
        tangentBitangent += /* wgsl */
        `
  var tbnUV: vec2f = ${normalTexture.texCoordAttributeName ?? "uv"};`;
        if ("useTransform" in normalTexture.texture.options && normalTexture.texture.options.useTransform) {
          tangentBitangent += /* wgsl */
          `
  tbnUV = (texturesMatrices.${normalTexture.texture.options.name}.matrix * vec3(tbnUV, 1.0)).xy;`;
        }
      } else if (clearcoatNormalTexture) {
        tangentBitangent += /* wgsl */
        `
  var tbnUV: vec2f = ${clearcoatNormalTexture.texCoordAttributeName ?? "uv"};`;
        if ("useTransform" in clearcoatNormalTexture.texture.options && clearcoatNormalTexture.texture.options.useTransform) {
          tangentBitangent += /* wgsl */
          `
  tbnUV = (texturesMatrices.${clearcoatNormalTexture.texture.options.name}.matrix * vec3(tbnUV, 1.0)).xy;`;
        }
      } else {
        tangentBitangent += /* wgsl */
        `
  let tbnUV: vec2f = uv;`;
      }
      tangentBitangent += /* wgsl */
      `
  let tbn = getTangentFrame(modelPosition, normal, tbnUV);
  `;
    }
  }
  return tangentBitangent;
};

export { getTangentBitangent };
