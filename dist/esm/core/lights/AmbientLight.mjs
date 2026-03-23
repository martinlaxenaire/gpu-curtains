import { Vec3 } from "../../math/Vec3.mjs";
import { Light } from "./Light.mjs";
//#region src/core/lights/AmbientLight.ts
/**
* Create an ambient light that equally illuminates all objects in the scene.
*
* This light cannot cast shadows.
*
* @example
* ```javascript
* // assuming 'renderer' is a valid Camera renderer
* const ambientLight = new AmbientLight(renderer, {
*   color: new Vec3(1),
*   intensity: 0.1,
* })
* ```
*/
var AmbientLight = class extends Light {
	/**
	* AmbientLight constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link AmbientLight}.
	* @param parameters - {@link LightBaseParams} used to create this {@link AmbientLight}.
	*/
	constructor(renderer, { label = "AmbientLight", color = new Vec3(1), intensity = .1 } = {}) {
		super(renderer, {
			label,
			color,
			intensity,
			type: "ambientLights"
		});
	}
	/** @ignore */
	applyPosition() {}
};
//#endregion
export { AmbientLight };
