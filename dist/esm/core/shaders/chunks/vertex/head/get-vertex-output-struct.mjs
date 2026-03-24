import { getVertexOutputStructContent } from "./get-vertex-output-struct-content.mjs";
//#region src/core/shaders/chunks/vertex/head/get-vertex-output-struct.ts
/**
* Get the vertex shader WGSL output struct using {@link getVertexOutputStructContent}.
* @param parameters - Parameters used to generate the vertex shader WGSL output struct.
* @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
* @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} to pass from the vertex shader to the fragment shader.
* @returns - String with the vertex shader WGSL output struct.
*/
const getVertexOutputStruct = ({ geometry, additionalVaryings = [] }) => {
	return `
struct VSOutput {
  ${getVertexOutputStructContent({
		geometry,
		additionalVaryings
	})}
};`;
};
//#endregion
export { getVertexOutputStruct };
