const declareAttributesVars = ({ geometry }) => {
  let attributeVars = geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.map((attribute) => {
      let { name, type } = attribute;
      let swizzle = "";
      if (name === "position" || name === "normal") {
        type = "vec3f";
        swizzle = ".xyz";
      } else if (name === "tangent") {
        type = "vec4f";
      } else if (name.indexOf("uv") !== -1) {
        type = "vec2f";
      }
      return (
        /* wgsl */
        `
  var ${name}: ${type} = ${type}(attributes.${name}${swizzle});`
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
