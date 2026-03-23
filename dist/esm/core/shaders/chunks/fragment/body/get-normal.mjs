import { getTextureSample } from "./get-texture-sample.mjs";
//#region src/core/shaders/chunks/fragment/body/get-normal.ts
/**
* Set the `normal` (`vec3f`) from `geometryNormal` (`vec3f`) or the a normal texture if it is set.
*
* @param parameters - Parameters used to create the shader chunk.
* @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
* @returns - A string with the `normal` (`vec3f`) value set.
*/
const getNormal = ({ normalTexture = null } = {}) => {
	let normal = "";
	if (normalTexture) {
		normal += getTextureSample(normalTexture, "normal");
		normal += `
  var mapN: vec3f = normalSample.rgb * 2.0 - 1.0;
  mapN = vec3(mapN.x * normalScale.x, mapN.y * normalScale.y, mapN.z);
  normal = normalize(tbn * mapN);
  `;
	} else normal += `
  normal = geometryNormal;`;
	return normal;
};
//#endregion
export { getNormal };
