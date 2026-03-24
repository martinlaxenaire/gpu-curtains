import { declareAttributesVars } from "../../chunks/vertex/body/declare-attributes-vars.mjs";
import { getVertexTransformedPositionNormal } from "../../chunks/vertex/body/get-vertex-transformed-position-normal.mjs";
import { getVertexOutputStruct } from "../../chunks/vertex/head/get-vertex-output-struct.mjs";
import { getVertexOutput } from "../../chunks/vertex/body/get-vertex-output.mjs";
import { patchAdditionalChunks } from "../../default-material-helpers.mjs";
//#region src/core/shaders/full/vertex/get-vertex-shader-code.ts
/**
* Build a vertex shader based on the provided options, mostly used for lit meshes vertex shader code generation.
* @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
* @returns - The vertex shader generated based on the provided parameters.
*/
const getVertexShaderCode = ({ bindings = [], geometry, chunks = null, additionalVaryings = [] }) => {
	chunks = patchAdditionalChunks(chunks);
	return `
${chunks.additionalHead}
  
${getVertexOutputStruct({
		geometry,
		additionalVaryings
	})}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars({ geometry })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getVertexTransformedPositionNormal({
		bindings,
		geometry
	})}
  
  ${getVertexOutput({ geometry })}
  
  // user defined additional contribution
  ${chunks.additionalContribution}

  return vsOutput;
}`;
};
//#endregion
export { getVertexShaderCode };
