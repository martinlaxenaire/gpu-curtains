import { getTextureSample } from "./get-texture-sample.mjs";
//#region src/core/shaders/chunks/fragment/body/get-diffuse-transmission.ts
/**
* Set the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values from the material diffuse transmission variables and eventual diffuse transmission textures.
*
* @param parameters - Parameters used to set the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if diffuse transmission is enabled.
* @param parameters.diffuseTransmissionTexture - {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels for color and `A` channel for intensity) to use if any.
* @param parameters.diffuseTransmissionFactorTexture - {@link ShaderTextureDescriptor | Diffuse transmission intensity texture descriptor} (using the `A` channel) to use if any.
* @param parameters.diffuseTransmissionColorTexture - {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels) to use if any.
* @returns - String with the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values set.
*/
const getDiffuseTransmission = ({ extensionsUsed = [], diffuseTransmissionTexture = null, diffuseTransmissionFactorTexture = null, diffuseTransmissionColorTexture = null }) => {
	let diffuseTransmission = `
  var diffuseTransmissionContribution: vec3f = vec3(1.0);
  var diffuseTransmissionThickness: f32 = 1.0;`;
	if (!extensionsUsed.includes("KHR_materials_diffuse_transmission")) return diffuseTransmission;
	if (diffuseTransmissionTexture) {
		diffuseTransmission += getTextureSample(diffuseTransmissionTexture, "diffuseTransmission");
		diffuseTransmission += `
  diffuseTransmission = diffuseTransmission * diffuseTransmissionSample.a;
  diffuseTransmissionColor = diffuseTransmissionColor * diffuseTransmissionSample.rgb;
      `;
	} else {
		if (diffuseTransmissionFactorTexture) {
			diffuseTransmission += getTextureSample(diffuseTransmissionFactorTexture, "diffuseTransmissionFactor");
			diffuseTransmission += `
  diffuseTransmission = diffuseTransmission * diffuseTransmissionFactorSample.a;
      `;
		}
		if (diffuseTransmissionColorTexture) {
			diffuseTransmission += getTextureSample(diffuseTransmissionColorTexture, "diffuseTransmissionColor");
			diffuseTransmission += `
  diffuseTransmissionColor = diffuseTransmissionColor * diffuseTransmissionColorSample.rgb;
      `;
		}
	}
	diffuseTransmission += `
  diffuseTransmissionContribution = diffuseTransmissionColor * (1.0 - metallic);`;
	if (extensionsUsed.includes("KHR_materials_volume")) diffuseTransmission += `
  diffuseTransmissionThickness = thickness * (modelScale.x + modelScale.y + modelScale.z) / 3.0;`;
	return diffuseTransmission;
};
//#endregion
export { getDiffuseTransmission };
