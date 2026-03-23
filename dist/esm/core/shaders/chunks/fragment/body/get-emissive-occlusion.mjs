//#region src/core/shaders/chunks/fragment/body/get-emissive-occlusion.ts
/**
* Set the `emissive` (`vec3f`) and `occlusion` (`f32`) values to use in our shader.
* @param parameters - Parameters to use to set the emissive and occlusion values.
* @param parameters.emissiveTexture - {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any.
* @param parameters.occlusionTexture - {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any.
* @returns - A string with `emissive` (`vec3f`) and `occlusion` (`f32`) values set.
*/
const getEmissiveOcclusion = ({ emissiveTexture = null, occlusionTexture = null } = {}) => {
	let emissiveOcclusion = `
  var occlusion: f32 = 1.0;`;
	if (emissiveTexture) {
		emissiveOcclusion += `
  var emissiveUV: vec2f = ${emissiveTexture.texCoordAttributeName ?? "uv"};`;
		if ("useTransform" in emissiveTexture.texture.options && emissiveTexture.texture.options.useTransform) emissiveOcclusion += `
  emissiveUV = (texturesMatrices.${emissiveTexture.texture.options.name}.matrix * vec3(emissiveUV, 1.0)).xy;`;
		emissiveOcclusion += `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture.options.name}, ${emissiveTexture.sampler?.name ?? "defaultSampler"}, emissiveUV).rgb;
  emissive *= emissiveSample;`;
	}
	emissiveOcclusion += `
  emissive *= emissiveStrength;`;
	if (occlusionTexture) {
		emissiveOcclusion += `
  var occlusionUV: vec2f = ${occlusionTexture.texCoordAttributeName ?? "uv"};`;
		if ("useTransform" in occlusionTexture.texture.options && occlusionTexture.texture.options.useTransform) emissiveOcclusion += `
  occlusionUV = (texturesMatrices.${occlusionTexture.texture.options.name}.matrix * vec3(occlusionUV, 1.0)).xy;`;
		emissiveOcclusion += `
  occlusion = textureSample(${occlusionTexture.texture.options.name}, ${occlusionTexture.sampler?.name ?? "defaultSampler"}, occlusionUV).r;`;
	}
	emissiveOcclusion += `
  occlusion = 1.0 + occlusionIntensity * (occlusion - 1.0);`;
	return emissiveOcclusion;
};
//#endregion
export { getEmissiveOcclusion };
