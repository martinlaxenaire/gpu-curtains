const getTangentBitangent = ({
  extensionsUsed = [],
  geometry = null,
  cullMode = "back",
  normalTexture = null,
  clearcoatNormalTexture = null
} = {}) => {
  let tangentBitangent = (
    /* wgsl */
    `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  var geometryNormal: vec3f = normal;`
  );
  if (cullMode !== "back") {
    tangentBitangent += /* wgsl */
    `
  geometryNormal = geometryNormal * faceDirection;
    `;
  }
  const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
  const needsTangentBitangent = !!normalTexture || !!clearcoatNormalTexture || extensionsUsed.includes("KHR_materials_anisotropy");
  if (needsTangentBitangent) {
    if (tangentAttribute) {
      tangentBitangent += /* wgsl */
      `
  var tbn = mat3x3f(normalize(tangent), normalize(bitangent), geometryNormal);`;
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
  var tbn = getTangentFrame(-modelPosition, normal, tbnUV);
  `;
    }
    if (cullMode !== "back") {
      tangentBitangent += /* wgsl */
      `
  tbn[0] *= faceDirection;
  tbn[1] *= faceDirection;
    `;
    }
  }
  return tangentBitangent;
};

export { getTangentBitangent };
