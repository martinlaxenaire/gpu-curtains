import { constants } from "../../chunks/utils/constants.mjs";
import { common } from "../../chunks/utils/common.mjs";
import { toneMappingUtils } from "../../chunks/utils/tone-mapping-utils.mjs";
import { getLightsInfos } from "../../chunks/fragment/head/get-lights-infos.mjs";
import { REIndirectDiffuse } from "../../chunks/fragment/head/RE-indirect-diffuse.mjs";
import { getLambertDirect } from "../../chunks/fragment/head/get-lambert-direct.mjs";
import { getLambertShading } from "../../chunks/fragment/body/get-lambert-shading.mjs";
import { applyToneMapping } from "../../chunks/fragment/body/apply-tone-mapping.mjs";
import { patchAdditionalChunks } from "../../default-material-helpers.mjs";
import { getFragmentInputStruct } from "../../chunks/fragment/head/get-fragment-input-struct.mjs";
import { getFragmentOutputStruct } from "../../chunks/fragment/head/get-fragment-output-struct.mjs";
import { declareAttributesVars } from "../../chunks/fragment/body/declare-attributes-vars.mjs";
import { declareMaterialVars } from "../../chunks/fragment/body/declare-material-vars.mjs";
import { getBaseColor } from "../../chunks/fragment/body/get-base-color.mjs";
import { getEmissiveOcclusion } from "../../chunks/fragment/body/get-emissive-occlusion.mjs";
import { getNormal } from "../../chunks/fragment/body/get-normal.mjs";
import { generateTBN } from "../../chunks/utils/generate-TBN.mjs";
import { getTangentBitangent } from "../../chunks/fragment/body/get-tangent-bitangent.mjs";
//#region src/core/shaders/full/fragment/get-lambert-fragment-shader-code.ts
/**
* Build a Lambert fragment shader using the provided options.
* @param parameters - {@link LambertFragmentShaderInputParams} used to build the Lambert fragment shader.
* @returns - The Lambert fragment shader generated based on the provided parameters.
*/
const getLambertFragmentShaderCode = ({ chunks = null, toneMapping = "Khronos", outputColorSpace = "srgb", fragmentOutput = {
	struct: [{
		type: "vec4f",
		name: "color"
	}],
	output: `
  var output: FSOutput;
  output.color = outputColor;
  return output;`
}, geometry, cullMode = "back", flatShading = false, additionalVaryings = [], materialUniform = null, materialUniformName = "material", receiveShadows = false, baseColorTexture = null, normalTexture = null, emissiveTexture = null, occlusionTexture = null }) => {
	chunks = patchAdditionalChunks(chunks);
	return `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${generateTBN}
${getLightsInfos}
${REIndirectDiffuse}
${getLambertDirect}

${getFragmentInputStruct({
		geometry,
		additionalVaryings
	})}

${getFragmentOutputStruct({ struct: fragmentOutput.struct })}

@fragment fn main(fsInput: FSInput) -> FSOutput {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({
		geometry,
		additionalVaryings
	})}
  ${declareMaterialVars({
		materialUniform,
		materialUniformName,
		shadingModel: "Lambert"
	})}
  ${getBaseColor({
		geometry,
		baseColorTexture
	})}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getTangentBitangent({
		geometry,
		cullMode,
		flatShading,
		normalTexture
	})}  
  ${getNormal({ normalTexture })}  
  ${getEmissiveOcclusion({
		emissiveTexture,
		occlusionTexture
	})}
  
  // lights
  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({
		toneMapping,
		outputColorSpace
	})}

  ${fragmentOutput.output}
}`;
};
//#endregion
export { getLambertFragmentShaderCode };
