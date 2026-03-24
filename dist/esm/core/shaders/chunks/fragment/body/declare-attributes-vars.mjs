//#region src/core/shaders/chunks/fragment/body/declare-attributes-vars.ts
/**
* Declare all the parameters coming from the fragment shader input struct. Used to declare mandatories `fragmentPosition` (`vec4f`), `frontFacing` (`bool`), `normal` (`vec3f`), `worldPosition` (`vec3f`), `viewDirection` (`vec3f`), `modelPosition` (`vec3f`) and `modelScale` (`vec3f`) passed by the vertex shader, as well as optionals `tangent` (`vec3f`), `bitangent` (`vec3f`) and UV coordinates (`vec2f`). Eventual vertex colors will be handled by the `get-base-color` chunk.
* @param parameters - Parameters used to declare the attributes variables.
* @param parameters.geometry - {@link Geometry} used to declare the attributes variables.
* @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} passed from the vertex shader to the fragment shader to declare.
* @returns - A string with all the attributes variables declared.
*/
const declareAttributesVars = ({ geometry, additionalVaryings = [] }) => {
	let attributeVars = `
  let fragmentPosition: vec4f = fsInput.position;
  let frontFacing: bool = fsInput.frontFacing;
  `;
	const normalAttribute = geometry && geometry.getAttributeByName("normal");
	const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
	const disabledAttributes = [
		"position",
		"normal",
		"tangent",
		"color",
		"joints",
		"weights"
	];
	const attributes = [];
	if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) geometry.vertexBuffers.forEach((vertexBuffer) => {
		vertexBuffer.attributes.forEach((attribute) => {
			if (!disabledAttributes.some((attr) => attribute.name.includes(attr))) {
				const attr = { ...attribute };
				if (attr.name.indexOf("uv") !== -1) attr.type = "vec2f";
				attributes.push(attr);
			}
		});
	});
	attributeVars += attributes.map((attribute) => {
		return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
	}).join("");
	if (normalAttribute) attributeVars += `
  var normal: vec3f = normalize(fsInput.normal);
    `;
	else attributeVars += `
  // silly default normal
  var normal: vec3f = vec3(0.0, 0.0, 1.0);
    `;
	if (tangentAttribute) attributeVars += `
  var tangent: vec3f = normalize(fsInput.tangent.xyz);
  var bitangent: vec3f = normalize(fsInput.bitangent);
    `;
	else attributeVars += `
  var tangent: vec3f;
  var bitangent: vec3f;
    `;
	attributeVars += `
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = normalize(fsInput.viewDirection);
  let modelPosition: vec3f = fsInput.modelPosition;
  let modelScale: vec3f = fsInput.modelScale;
  `;
	attributeVars += additionalVaryings.map((attribute) => {
		return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
	}).join("");
	return attributeVars;
};
//#endregion
export { declareAttributesVars };
