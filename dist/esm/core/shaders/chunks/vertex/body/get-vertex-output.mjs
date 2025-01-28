const getVertexOutput = ({ geometry }) => {
  let output = (
    /* wgsl */
    `
  vsOutput.position = camera.projection * camera.view * worldPosition;
  vsOutput.normal = normal;
  vsOutput.worldPosition = worldPosition.xyz / worldPosition.w;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
  vsOutput.modelScale = vec3(
    length(modelMatrix[0].xyz),
    length(modelMatrix[1].xyz),
    length(modelMatrix[2].xyz)
  );
  `
  );
  const tangentAttribute = geometry.getAttributeByName("tangent");
  if (tangentAttribute) {
    output += /* wgsl */
    `
  vsOutput.tangent = normalize(modelMatrix * tangent);
  vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * vsOutput.tangent.w;
    `;
  }
  output += geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.filter((attr) => attr.name !== "normal" && attr.name !== "position" && attr.name !== "tangent").map((attribute) => {
      return (
        /* wgsl */
        `
  vsOutput.${attribute.name} = ${attribute.name};`
      );
    }).join("")
  ).join("\n");
  return output;
};

export { getVertexOutput };
