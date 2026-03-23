//#region src/core/shaders/chunks/fragment/body/get-indirect-diffuse.ts
/**
* Get Render Equations for indirect diffuse contribution, accounting for sheen energy compensation if needed.
*
* @param parameters - Parameters used to set the indirect diffuse contribution.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
* @returns - Correct Render Equations function.
*/
const getIndirectDiffuse = ({ extensionsUsed = [] }) => {
	let indirectDiffuse = "";
	if (extensionsUsed.includes("KHR_materials_sheen")) indirectDiffuse += `
  RE_IndirectDiffuseSheen(irradiance, diffuseContribution, sheenEnergyComp, &reflectedLight);`;
	else indirectDiffuse += `
  RE_IndirectDiffuse(irradiance, diffuseContribution, &reflectedLight);`;
	return indirectDiffuse;
};
//#endregion
export { getIndirectDiffuse };
