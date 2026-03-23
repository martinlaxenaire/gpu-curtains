//#region src/core/shaders/chunks/fragment/body/get-IBL-sheen-indirect-radiance.ts
/**
* Set the sheen specular indirect contribution as `sheenSpecularIndirect` (`vec3f`).
* @param parameters - Parameters used to set the `sheenSpecularIndirect` (`vec3f`) value.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
* @returns - String with the `sheenSpecularIndirect` (`vec3f`) value set.
*/
const getIBLSheenIndirectRadiance = ({ extensionsUsed = [], environmentMap = null } = {}) => {
	let sheenIndirect = `
  var sheenEnergyComp: f32 = 1.0;`;
	if (extensionsUsed.includes("KHR_materials_sheen")) {
		if (environmentMap && environmentMap.lutTexture) sheenIndirect += `
  let sheenBRDFCharlie: f32 = getBRDFCharlie(
    normal,
    viewDirection,
    sheenRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name}
  );

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  let sheenAlbedoScale: f32 = sheenBRDFCharlie;`;
		else sheenIndirect += `
  let sheenBRDFCharlie: f32 = getBRDFCharlieApprox(normal, viewDirection, sheenRoughness);

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  // we could also use 0.157 as approximation
  let sheenAlbedoScale: f32 = getSheenAlbedoScaleApprox(normal, viewDirection, sheenRoughness);`;
		sheenIndirect += `
  sheenEnergyComp = 1.0 - max3(sheenColor) * sheenAlbedoScale;`;
	}
	return sheenIndirect;
};
//#endregion
export { getIBLSheenIndirectRadiance };
