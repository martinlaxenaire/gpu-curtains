const declareAttributesVars = ({ geometry }) => {
  let attributeVars = geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.map((attribute) => {
      return (
        /* wgsl */
        `
  var ${attribute.name}: ${attribute.type} = attributes.${attribute.name};`
      );
    }).join("")
  ).join("\n");
  attributeVars += /* wgsl */
  `
  var instanceIndex: u32 = attributes.instanceIndex;
  `;
  return attributeVars;
};

export { declareAttributesVars };
