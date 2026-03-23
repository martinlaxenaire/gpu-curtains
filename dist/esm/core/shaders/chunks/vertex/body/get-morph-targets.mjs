import { BufferElement } from "../../../../bindings/bufferElements/BufferElement.mjs";
//#region src/core/shaders/chunks/vertex/body/get-morph-targets.ts
/**
* Compute the morphed targets transformations using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} array parameters if any.
* @param parameters - {@link VertexShaderInputBaseParams} used to compute the morphed `worldPosition` and `normal` vectors if any morph target is defined in the {@link core/geometries/Geometry.Geometry | Geometry} attributes.
* @returns - The part of the vertex shader where the moprhed target is applied.
*/
const getMorphTargets = ({ bindings = [], geometry }) => {
	let morphTargets = "";
	bindings.filter((binding) => binding.name.includes("morphTarget")).forEach((binding) => {
		const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== "weight");
		morphAttributes.forEach((input) => {
			const bindingType = BufferElement.getType(input.type);
			const attribute = geometry.getAttributeByName(input.name);
			if (attribute) {
				const attributeType = attribute.type;
				const attributeBindingVar = morphAttributes.length === 1 ? `${binding.name}.${input.name}[attributes.vertexIndex]` : `${binding.name}.elements[attributes.vertexIndex].${input.name}`;
				if (bindingType === attributeType) morphTargets += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};\n\t`;
				else if (bindingType === "vec3f" && attributeType === "vec4f") morphTargets += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);\n\t`;
			}
		});
	});
	return morphTargets;
};
//#endregion
export { getMorphTargets };
