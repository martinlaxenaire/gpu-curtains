const getBaseColor = ({
  geometry = null,
  baseColorTexture = null
} = {}) => {
  let baseColor = (
    /* wgsl */
    `
  var baseColor: vec4f = vec4(baseColorFactor, baseOpacityFactor);
  `
  );
  const colorAttributes = [];
  if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name.includes("color")) {
          colorAttributes.push(attribute);
        }
      });
    });
  }
  colorAttributes.forEach((colorAttribute) => {
    if (colorAttribute.type === "vec3f") {
      baseColor += /* wgsl */
      `
  baseColor *= vec4(fsInput.${colorAttribute.name}, 1.0);`;
    } else {
      baseColor += /* wgsl */
      `
  baseColor *= fsInput.${colorAttribute.name};`;
    }
  });
  if (baseColorTexture) {
    baseColor += /* wgsl */
    `
  var baseColorUV: vec2f = ${baseColorTexture.texCoordAttributeName ?? "uv"};`;
    if (baseColorTexture.texture.options.useTransform) {
      baseColor += /* wgsl */
      `
  baseColorUV = (${baseColorTexture.texture.options.name}Matrix * vec3(baseColorUV, 1.0)).xy;`;
    }
    baseColor += /* wgsl */
    `
  let baseColorSample: vec4f = textureSample(${baseColorTexture.texture.options.name}, ${baseColorTexture.sampler?.name ?? "defaultSampler"}, baseColorUV);
  baseColor *= baseColorSample;
  `;
  }
  baseColor += /* wgsl */
  `
  if (baseColor.a < alphaCutoff) {
    discard;
  }
  
  outputColor = baseColor;
  `;
  return baseColor;
};

export { getBaseColor };
