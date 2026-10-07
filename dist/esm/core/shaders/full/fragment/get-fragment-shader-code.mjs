import { getUnlitFragmentShaderCode } from "./get-unlit-fragment-shader-code.mjs";
import { getLambertFragmentShaderCode } from "./get-lambert-fragment-shader-code.mjs";
import { getPhongFragmentShaderCode } from "./get-phong-fragment-shader-code.mjs";
import { getPBRFragmentShaderCode } from "./get-PBR-fragment-shader-code.mjs";
//#region src/core/shaders/full/fragment/get-fragment-shader-code.ts
/**
* Build a fragment shader using the provided options, mostly used for lit meshes fragment shader code generation.
* @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
* @returns - The fragment shader generated based on the provided parameters.
*/
const getFragmentShaderCode = ({ shadingModel = "PBR", fragmentOutput = {
	struct: [{
		type: "vec4f",
		name: "color"
	}],
	output: `
  var output: FSOutput;
  output.color = outputColor;
  return output;`
}, chunks = null, geometry, cullMode = "back", flatShading = false, additionalVaryings = [], materialUniform = null, materialUniformName = "material", extensionsUsed = [], receiveShadows = false, baseColorTexture = null, normalTexture = null, emissiveTexture = null, occlusionTexture = null, metallicRoughnessTexture = null, specularTexture = null, specularFactorTexture = null, specularColorTexture = null, transmissionThicknessTexture = null, transmissionTexture = null, thicknessTexture = null, sheenTexture = null, sheenColorTexture = null, sheenRoughnessTexture = null, anisotropyTexture = null, clearcoatTexture = null, clearcoatFactorTexture = null, clearcoatRoughnessTexture = null, clearcoatNormalTexture = null, iridescenceTexture = null, iridescenceFactorTexture = null, iridescenceThicknessTexture = null, diffuseTransmissionTexture = null, diffuseTransmissionFactorTexture = null, diffuseTransmissionColorTexture = null, transmissionBackgroundTexture = null, environmentMap = null }) => {
	switch (shadingModel) {
		case "Unlit": return getUnlitFragmentShaderCode({
			chunks,
			fragmentOutput,
			geometry,
			additionalVaryings,
			materialUniform,
			materialUniformName,
			baseColorTexture,
			emissiveTexture,
			occlusionTexture
		});
		case "Lambert": return getLambertFragmentShaderCode({
			chunks,
			fragmentOutput,
			geometry,
			cullMode,
			flatShading,
			additionalVaryings,
			materialUniform,
			materialUniformName,
			receiveShadows,
			baseColorTexture,
			normalTexture,
			emissiveTexture,
			occlusionTexture
		});
		case "Phong": return getPhongFragmentShaderCode({
			chunks,
			fragmentOutput,
			geometry,
			cullMode,
			flatShading,
			additionalVaryings,
			materialUniform,
			materialUniformName,
			receiveShadows,
			baseColorTexture,
			normalTexture,
			emissiveTexture,
			occlusionTexture,
			metallicRoughnessTexture,
			specularTexture,
			specularFactorTexture,
			specularColorTexture
		});
		default: return getPBRFragmentShaderCode({
			chunks,
			fragmentOutput,
			geometry,
			cullMode,
			flatShading,
			additionalVaryings,
			materialUniform,
			materialUniformName,
			extensionsUsed,
			receiveShadows,
			baseColorTexture,
			normalTexture,
			emissiveTexture,
			occlusionTexture,
			metallicRoughnessTexture,
			specularTexture,
			specularFactorTexture,
			specularColorTexture,
			transmissionThicknessTexture,
			transmissionTexture,
			thicknessTexture,
			sheenTexture,
			sheenColorTexture,
			sheenRoughnessTexture,
			anisotropyTexture,
			clearcoatTexture,
			clearcoatFactorTexture,
			clearcoatRoughnessTexture,
			clearcoatNormalTexture,
			iridescenceTexture,
			iridescenceFactorTexture,
			iridescenceThicknessTexture,
			diffuseTransmissionTexture,
			diffuseTransmissionFactorTexture,
			diffuseTransmissionColorTexture,
			transmissionBackgroundTexture,
			environmentMap
		});
	}
};
//#endregion
export { getFragmentShaderCode };
