import { isCurtainsRenderer } from "../../core/renderers/utils.mjs";
import { PlaneGeometry } from "../../core/geometries/PlaneGeometry.mjs";
import { cacheManager } from "../../utils/CacheManager.mjs";
import { DOMMesh } from "./DOMMesh.mjs";
//#region src/curtains/meshes/Plane.ts
/** @const - default {@link Plane} parameters */
const defaultPlaneParams = {
	label: "Plane",
	instancesCount: 1,
	vertexBuffers: []
};
/**
* Used to create a special {@link DOMMesh} class object using a {@link PlaneGeometry}.
* This means a quad that looks like an ordinary {@link HTMLElement} but with WebGPU rendering capabilities.
*
* @example
* ```javascript
* // set our main GPUCurtains instance
* const gpuCurtains = new GPUCurtains({
*   container: '#canvas' // selector of our WebGPU canvas container
* })
*
* // set the GPU device
* // note this is asynchronous
* await gpuCurtains.setDevice()
*
* // create a Plane,
* // assuming there's a HTML element with the "plane" ID in the DOM
* // will use the normals colors as default shading
* const plane = new Plane(gpuCurtains, '#plane', {
*   label: 'My plane',
* })
* ```
*/
var Plane = class extends DOMMesh {
	/**
	* Plane constructor
	* @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
	* @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
	* @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
	*/
	constructor(renderer, element, parameters = {}) {
		renderer = isCurtainsRenderer(renderer, parameters.label ? parameters.label + " Plane" : "Plane");
		let { geometry, widthSegments, heightSegments, ...DOMMeshParams } = {
			...defaultPlaneParams,
			...parameters
		};
		const { instancesCount, vertexBuffers, ...materialParams } = DOMMeshParams;
		if (!geometry || geometry.type !== "PlaneGeometry") {
			widthSegments = widthSegments ?? 1;
			heightSegments = heightSegments ?? 1;
			const geometryID = widthSegments * heightSegments + widthSegments;
			if (!vertexBuffers.length) geometry = cacheManager.getPlaneGeometryByID(geometryID);
			if (!geometry) {
				geometry = new PlaneGeometry({
					widthSegments,
					heightSegments,
					instancesCount,
					vertexBuffers
				});
				cacheManager.addPlaneGeometry(geometry);
			} else geometry.instancesCount = instancesCount;
		}
		super(renderer, element, {
			geometry,
			...materialParams
		});
		this.type = "Plane";
	}
};
//#endregion
export { Plane };
