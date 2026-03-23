//#region src/core/shaders/chunks/fragment/body/get-IBL-indirect-irradiance.ts
/**
* Get the environment map indirect irradiance (diffuse).
* @param parameters - Parameters to use to apply PBR shading.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if diffuse transmission is enabled.
* @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect irradiance if any.
* @returns - String with environment map indirect irradiance applied to `iblIrradiance` (`vec3f`).
*/
const getIBLIndirectIrradiance = ({ extensionsUsed = [], environmentMap = null }) => {
	let iblIndirectDiffuse = "";
	if (environmentMap) {
		iblIndirectDiffuse += `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  ) ;`;
		if (extensionsUsed.includes("KHR_materials_diffuse_transmission")) {
			iblIndirectDiffuse += `    
  var diffuseTransmissionIblIrradiance: vec3f = getIBLIndirectIrradiance(
    -1.0 * normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`;
			if (extensionsUsed.includes("KHR_materials_volume")) iblIndirectDiffuse += `
  diffuseTransmissionIblIrradiance *= volumeAttenuation(diffuseTransmissionThickness, attenuationColor, attenuationDistance);
    `;
			if (extensionsUsed.includes("KHR_materials_volume_scatter")) iblIndirectDiffuse += `
  // diffuseTransmissionIblIrradiance *= 1.0 - singleVolumeScatter;
  diffuseTransmissionIblIrradiance *= singleVolumeScatter;
    `;
			iblIndirectDiffuse += `    
  iblIrradiance = mix(iblIrradiance, diffuseTransmissionIblIrradiance, diffuseTransmission);`;
		}
	}
	return iblIndirectDiffuse;
};
//#endregion
export { getIBLIndirectIrradiance };
