//#region src/core/shaders/chunks/fragment/body/apply-sheen-clearcoat-contribution.ts
/**
* Update the `outgoingLight` (`vec3f`) value with the eventual sheen and/or clearcoat specular contributions.
*
* @param parameters - Parameters used to create the shader chunk.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen and/or clearcoat are enabled.
* @returns - Updated `outgoingLight` (`vec3f`) with the sheen and/or clearcoat specular contributions.
*/
const applySheenClearcoatContribution = ({ extensionsUsed = [] } = {}) => {
	let sheenClearcoatContribution = "";
	if (extensionsUsed.includes("KHR_materials_sheen")) sheenClearcoatContribution += `
  outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
    `;
	if (extensionsUsed.includes("KHR_materials_clearcoat")) sheenClearcoatContribution += `
  let dotNVcc: f32 = saturate( dot( clearcoatNormal, viewDirection ));
  let Fcc: vec3f = F_Schlick( clearcoatF0, clearcoatF90, dotNVcc );
  let clearcoatEnergyComp: vec3f = ( 1.0 - clearcoat * Fcc );
  let clearcoatContribution: vec3f = ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * clearcoat;

  outgoingLight = outgoingLight * clearcoatEnergyComp + clearcoatContribution;
    `;
	return sheenClearcoatContribution;
};
//#endregion
export { applySheenClearcoatContribution };
