import { BufferElement } from '../../../../bindings/bufferElements/BufferElement.mjs';

const getMorphTargets = ({ bindings = [], geometry }) => {
  let morphTargets = "";
  const morphTargetsBindings = bindings.filter((binding) => binding.name.includes("morphTarget"));
  morphTargetsBindings.forEach((binding) => {
    const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== "weight");
    morphAttributes.forEach((input) => {
      const bindingType = BufferElement.getType(input.type);
      const attribute = geometry.getAttributeByName(input.name);
      if (attribute) {
        const attributeType = attribute.type;
        const attributeBindingVar = morphAttributes.length === 1 ? `${binding.name}.${input.name}[attributes.vertexIndex]` : `${binding.name}.elements[attributes.vertexIndex].${input.name}`;
        if (bindingType === attributeType) {
          morphTargets += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};
	`;
        } else {
          if (bindingType === "vec3f" && attributeType === "vec4f") {
            morphTargets += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);
	`;
          }
        }
      }
    });
  });
  return morphTargets;
};

export { getMorphTargets };
