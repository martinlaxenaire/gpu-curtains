//#region src/core/materials/utils.ts
/**
* Compare two sets of {@link RenderMaterialRenderingOptions | rendering options} and returns an array of different options keys if any.
* @param newOptions - Rendering new options to compare.
* @param baseOptions - Rendering options to compare with.
* @returns - An array with the options keys that differ, if any.
*/
const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
	return [
		"useProjection",
		"transparent",
		"depth",
		"depthWriteEnabled",
		"depthCompare",
		"depthFormat",
		"cullMode",
		"sampleCount",
		"targets",
		"stencil",
		"verticesOrder",
		"topology"
	].map((key) => {
		if (newOptions[key] !== void 0 && baseOptions[key] === void 0 || baseOptions[key] !== void 0 && newOptions[key] === void 0) return key;
		else if (Array.isArray(newOptions[key]) || typeof newOptions[key] === "object") return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]) ? key : false;
		else return newOptions[key] !== baseOptions[key] ? key : false;
	}).filter(Boolean);
};
//#endregion
export { compareRenderingOptions };
