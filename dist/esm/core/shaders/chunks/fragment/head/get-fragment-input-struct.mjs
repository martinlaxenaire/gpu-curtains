import { getVertexOutputStructContent } from "../../vertex/head/get-vertex-output-struct-content.mjs";
//#region src/core/shaders/chunks/fragment/head/get-fragment-input-struct.ts
/**
* Get the fragment shader WGSL input struct using {@link getVertexOutputStructContent}.
* @param parameters - Parameters used to generate the fragment shader WGSL input struct.
* @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
* @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} passed from the vertex shader to the fragment shader.
* @returns - String with the fragment shader WGSL input struct.
*/
const getFragmentInputStruct = ({ geometry, additionalVaryings = [] }) => {
	return `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({
		geometry,
		additionalVaryings
	})}
};`;
};
//#endregion
export { getFragmentInputStruct };
