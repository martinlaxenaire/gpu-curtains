import { getMorphTargets } from "./get-morph-targets.mjs";
import { getVertexSkinnedPositionNormal } from "./get-vertex-skinned-position-normal.mjs";
//#region src/core/shaders/chunks/vertex/body/get-vertex-transformed-position-normal.ts
/**
* Generate the part of the vertex shader dedicated to compute the output transformed `worldPosition` and `normal` vectors. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link BufferBinding} array parameters.
*
* Used internally by the various {@link core/shadows/Shadow.Shadow | Shadow} classes and the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
*
* @param parameters - {@link VertexShaderInputBaseParams} used to compute the output transformed `worldPosition` and `normal` vectors.
* @returns - The part of the vertex shader dedicated to computing the output transformed `worldPosition` and `normal` vectors.
*/
const getVertexTransformedPositionNormal = ({ bindings = [], geometry }) => {
	let output = "";
	output += getMorphTargets({
		bindings,
		geometry
	});
	output += `
  var worldPosition: vec4f = vec4(position, 1.0);
  `;
	output += getVertexSkinnedPositionNormal({
		bindings,
		geometry
	});
	return output;
};
//#endregion
export { getVertexTransformedPositionNormal };
