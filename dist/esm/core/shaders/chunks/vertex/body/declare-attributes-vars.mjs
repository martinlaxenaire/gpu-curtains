const declareAttributesVars = ({ geometry }) => {
  return geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.map((attribute) => {
      return (
        /* wgsl */
        `
  var ${attribute.name}: ${attribute.type} = attributes.${attribute.name};`
      );
    }).join("")
  ).join("\n");
};

export { declareAttributesVars };
