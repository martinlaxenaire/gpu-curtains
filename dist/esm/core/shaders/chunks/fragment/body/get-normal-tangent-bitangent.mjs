const getNormalTangentBitangent = ({
  geometry = null,
  normalTexture = null
} = {}) => {
  let normalTangentBitangent = (
    /* wgsl */
    `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;`
  );
  const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
  const hasTangent = !!(normalTexture && tangentAttribute);
  if (normalTexture) {
    normalTangentBitangent += /* wgsl */
    `
  var normalUV: vec2f = ${normalTexture.texCoordAttributeName ?? "uv"};`;
    if ("useTransform" in normalTexture.texture.options && normalTexture.texture.options.useTransform) {
      normalTangentBitangent += /* wgsl */
      `
  normalUV = (texturesMatrices.${normalTexture.texture.options.name}.matrix * vec3(normalUV, 1.0)).xy;`;
    }
    if (!hasTangent) {
      normalTangentBitangent += /* wgsl */
      `
  // TODO decide whether we're computing tangent and bitangent
  // with normal or with derivatives
  /*
  let Q1: vec3f = dpdx(worldPosition);
  let Q2: vec3f = dpdy(worldPosition);
  let st1: vec2f = dpdx(normalUV);
  let st2: vec2f = dpdy(normalUV);
  
  tangent = normalize(Q1 * st2.y - Q2 * st1.y);
  bitangent = normalize(-Q1 * st2.x + Q2 * st1.x);
  */
  
  bitangent = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  
  if (1.0 - abs(NdotUp) <= EPSILON) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  tangent = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);
  `;
    }
    normalTangentBitangent += /* wgsl */
    `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);
  let normalMap = textureSample(${normalTexture.texture.options.name}, ${normalTexture.sampler?.name ?? "defaultSampler"}, normalUV).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(vec2(normalScale), 1.0)));`;
  } else {
    normalTangentBitangent += /* wgsl */
    `
  normal = geometryNormal;`;
  }
  return normalTangentBitangent;
};

export { getNormalTangentBitangent };
