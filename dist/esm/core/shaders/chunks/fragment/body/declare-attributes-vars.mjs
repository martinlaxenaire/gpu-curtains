const declareAttributesVars = ({
  geometry,
  additionalVaryings = []
}) => {
  let attributeVars = (
    /* wgsl */
    `
  let frontFacing: bool = fsInput.frontFacing;
  `
  );
  const normalAttribute = geometry && geometry.getAttributeByName("normal");
  const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
  const disabledAttributes = ["position", "normal", "tangent", "color", "joints", "weights"];
  const attributes = [];
  if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (!disabledAttributes.some((attr) => attribute.name.includes(attr))) {
          attributes.push(attribute);
        }
      });
    });
  }
  attributeVars += attributes.map((attribute) => {
    return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
  }).join("");
  if (normalAttribute) {
    attributeVars += /* wgsl */
    `
  var normal: vec3f = normalize(fsInput.normal);
    `;
  } else {
    attributeVars += /* wgsl */
    `
  // silly default normal
  var normal: vec3f = vec3(0.0, 0.0, 1.0);
    `;
  }
  if (tangentAttribute) {
    attributeVars += /* wgsl */
    `
  var tangent: vec3f = normalize(fsInput.tangent.xyz);
  var bitangent: vec3f = normalize(fsInput.bitangent);
    `;
  } else {
    attributeVars += /* wgsl */
    `
  var tangent: vec3f;
  var bitangent: vec3f;
    `;
  }
  attributeVars += /* wgsl */
  `
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  let modelScale: vec3f = fsInput.modelScale;
  `;
  attributeVars += additionalVaryings.map((attribute) => {
    return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
  }).join("");
  return attributeVars;
};

export { declareAttributesVars };
