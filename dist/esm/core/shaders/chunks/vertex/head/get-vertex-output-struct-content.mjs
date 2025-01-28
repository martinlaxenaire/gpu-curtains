const getVertexOutputStructContent = ({ geometry }) => {
  const tangentAttribute = geometry.getAttributeByName("tangent");
  const attributes = [];
  if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name !== "position") {
          attributes.push(attribute);
        }
      });
    });
  }
  if (tangentAttribute) {
    attributes.push({
      name: "bitangent",
      type: "vec3f"
    });
  }
  const structAttributes = attributes.map((attribute, index) => {
    return `
  @location(${index}) ${attribute.name}: ${attribute.type},`;
  }).join("");
  return `
  @builtin(position) position: vec4f,
  ${structAttributes}
  @location(${attributes.length}) viewDirection: vec3f,
  @location(${attributes.length + 1}) worldPosition: vec3f,
  @location(${attributes.length + 2}) modelScale: vec3f,`;
};

export { getVertexOutputStructContent };
