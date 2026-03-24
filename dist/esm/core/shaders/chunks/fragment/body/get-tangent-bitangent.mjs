//#region src/core/shaders/chunks/fragment/body/get-tangent-bitangent.ts
/**
* Set the `geometryNormal` (`vec3f`) and eventually `tangent` (`vec3f`) and `bitangent` (`vec3f`) values if a normal texture, clearcoat normal texture is set, or if anisotropy extension is enabled.
*
* Tangent and bitangent are calculated using derivatives if the {@link Geometry} `tangent` and `bitangent` attributes are missing.
* @param parameters - Parameters used to create the shader chunk.
* @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
* @param parameters.geometry - {@link Geometry} to use to check for `tangent` and `bitangent` attributes.
* @param parameters.cullMode - Culling mode used to update normal and TBN if needed.
* @param parameters.flatShading - Whether to calculate flat normals.
* @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
* @param parameters.clearcoatNormalTexture - {@link ShaderTextureDescriptor | Clearcoat normal texture descriptor} to use if any.
*/
const getTangentBitangent = ({ extensionsUsed = [], geometry = null, cullMode = "back", flatShading = false, normalTexture = null, clearcoatNormalTexture = null } = {}) => {
	let tangentBitangent = `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  var geometryNormal: vec3f = normal;`;
	if (flatShading) tangentBitangent += `
  let fdx: vec3f = dpdx( modelPosition );
	let fdy: vec3f = dpdy( modelPosition );
	geometryNormal = normalize( cross( fdx, -fdy ) );`;
	if (cullMode !== "back" && !flatShading) tangentBitangent += `
  geometryNormal = geometryNormal * faceDirection;
    `;
	const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
	if (!!normalTexture || !!clearcoatNormalTexture || extensionsUsed.includes("KHR_materials_anisotropy")) {
		if (tangentAttribute) tangentBitangent += `
  var tbn = mat3x3f(normalize(tangent), normalize(bitangent), geometryNormal);`;
		else {
			if (normalTexture) {
				tangentBitangent += `
  var tbnUV: vec2f = ${normalTexture.texCoordAttributeName ?? "uv"};`;
				if ("useTransform" in normalTexture.texture.options && normalTexture.texture.options.useTransform) tangentBitangent += `
  tbnUV = (texturesMatrices.${normalTexture.texture.options.name}.matrix * vec3(tbnUV, 1.0)).xy;`;
			} else if (clearcoatNormalTexture) {
				tangentBitangent += `
  var tbnUV: vec2f = ${clearcoatNormalTexture.texCoordAttributeName ?? "uv"};`;
				if ("useTransform" in clearcoatNormalTexture.texture.options && clearcoatNormalTexture.texture.options.useTransform) tangentBitangent += `
  tbnUV = (texturesMatrices.${clearcoatNormalTexture.texture.options.name}.matrix * vec3(tbnUV, 1.0)).xy;`;
			} else tangentBitangent += `
  let tbnUV: vec2f = uv;`;
			tangentBitangent += `
  var tbn = getTangentFrame(-modelPosition, normal, tbnUV);
  `;
		}
		if (cullMode !== "back" && !flatShading) tangentBitangent += `
  tbn[0] *= faceDirection;
  tbn[1] *= faceDirection;
    `;
	}
	return tangentBitangent;
};
//#endregion
export { getTangentBitangent };
