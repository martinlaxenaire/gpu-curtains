import { getPositionHelpers } from "./chunks/vertex/head/get-position-helpers.mjs";
import { getNormalHelpers } from "./chunks/vertex/head/get-normal-helpers.mjs";
import { getUVCover } from "./chunks/fragment/head/get-uv-cover-helper.mjs";
import { getVertexToUVCoords } from "./chunks/fragment/head/get-vertex-to-UV-coords-helpers.mjs";
//#region src/core/shaders/shader-chunks.ts
/**
* Useful WGSL code chunks added to the vertex and/or fragment shaders
*/
const shaderChunks = {
	vertex: { getUVCover },
	fragment: {
		getUVCover,
		getVertexToUVCoords
	}
};
/**
* Useful WGSL code chunks added to the projected Meshes vertex and/or fragment shaders
*/
const ProjectedShaderChunks = {
	vertex: {
		getPositionHelpers,
		getNormalHelpers
	},
	fragment: {}
};
//#endregion
export { ProjectedShaderChunks, shaderChunks };
