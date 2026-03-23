import { throwError } from "../../utils/utils.mjs";
import { Object3D } from "../objects3D/Object3D.mjs";
//#region src/core/renderers/utils.ts
/**
* Format a renderer error based on given renderer, renderer type and object type.
* @param renderer - Renderer that failed the test.
* @param rendererType - Expected renderer type.
* @param type - Object type.
*/
const formatRendererError = (renderer, rendererType = "GPURenderer", type) => {
	throwError(type ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}` : `The ${rendererType} is not defined: ${renderer}`);
};
/**
* Check if the given renderer is a {@link Renderer}.
* @param renderer - Renderer to test.
* @param type - Object type used to format the error if needed.
* @returns - The {@link Renderer} if correctly set.
*/
const isRenderer = (renderer, type) => {
	renderer = renderer && renderer.renderer || renderer;
	if (!(renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer"))) formatRendererError(renderer, "GPURenderer", type);
	return renderer;
};
/**
* Check if the given renderer is a {@link CameraRenderer}.
* @param renderer - Renderer to test.
* @param type - Object type used to format the error if needed.
* @returns - The {@link CameraRenderer} if correctly set.
*/
const isCameraRenderer = (renderer, type) => {
	renderer = renderer && renderer.renderer || renderer;
	if (!(renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer"))) formatRendererError(renderer, "GPUCameraRenderer", type);
	return renderer;
};
/**
* Check if the given renderer is a {@link GPUCurtainsRenderer}.
* @param renderer - Renderer to test.
* @param type - Object type used to format the error if needed.
* @returns - The {@link GPUCurtainsRenderer} if correctly set.
*/
const isCurtainsRenderer = (renderer, type) => {
	renderer = renderer && renderer.renderer || renderer;
	if (!(renderer && renderer.type === "GPUCurtainsRenderer")) formatRendererError(renderer, "GPUCurtainsRenderer", type);
	return renderer;
};
/**
* Check if a given object is a {@link ProjectedMesh | projected mesh}.
* @param object - Object to test.
* @returns - Given object as a {@link ProjectedMesh | projected mesh} if the test is successful, `false` otherwise.
*/
const isProjectedMesh = (object) => {
	return "geometry" in object && "material" in object && object instanceof Object3D ? object : false;
};
//#endregion
export { isCameraRenderer, isCurtainsRenderer, isProjectedMesh, isRenderer };
