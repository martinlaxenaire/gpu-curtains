import { Vec3 } from "../../math/Vec3.mjs";
import { Light } from "./Light.mjs";
import { PointShadow } from "../shadows/PointShadow.mjs";
//#region src/core/lights/PointLight.ts
/**
* Create a point light, that is emitted from a point to all directions with an attenuation. A common use case for this type of light is to replicate the light emitted from a bare light bulb.
*
* This light can cast {@link PointShadow}.
*
* @example
* ```javascript
* // assuming 'renderer' is a valid Camera renderer
*
* // this point light will not cast any shadows
* const pointLight = new PointLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(5, 2, 3),
* })
*
* // this point light will cast shadows
* const pointLightWithShadows = new PointLight(renderer, {
*   color: new Vec3(1),
*   intensity: 10,
*   range: 3,
*   position: new Vec3(-10, 10, -5),
*   shadow: {
*     intensity: 1,
*   },
* })
*
* // this point light will ALSO cast shadows!
* const anotherPointLightWithShadows = new PointLight(renderer, {
*   color: new Vec3(1),
*   intensity: 5,
*   range: 100,
*   position: new Vec3(12, 0.5, 5),
*   shadow: {}, // that's enough to start casting shadows
* })
*
* // this point light will cast shadows as well...
* const lastPointLightWithShadows = new PointLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(10),
* })
*
* // ... because we're telling it here to start casting shadows
* lastPointLightWithShadows.shadow.cast()
* ```
*/
var PointLight = class extends Light {
	/** @ignore */
	#range;
	/**
	* PointLight constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link PointLight}.
	* @param parameters - {@link PointLightBaseParams} used to create this {@link PointLight}.
	*/
	constructor(renderer, { label = "PointLight", color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0, shadow = null } = {}) {
		super(renderer, {
			label,
			color,
			intensity,
			type: "pointLights"
		});
		this.options = {
			...this.options,
			position,
			range,
			shadow
		};
		this.position.copy(position);
		this.range = range;
		this.parent = this.renderer.scene;
		this.shadow = new PointShadow(this.renderer, {
			autoRender: false,
			light: this
		});
		if (shadow) this.shadow.cast(shadow);
	}
	/**
	* Set or reset this {@link PointLight} {@link CameraRenderer}.
	* @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
	*/
	setRenderer(renderer) {
		super.setRenderer(renderer);
		if (this.shadow) this.shadow.setRenderer(renderer);
	}
	/**
	* Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link PointLight} has been overflowed or when updating the {@link PointLight} {@link renderer}.
	* @param resetShadow - Whether to reset the {@link PointLight} shadow if any. Set to `true` when the {@link renderer} number of {@link PointLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
	*/
	reset(resetShadow = true) {
		super.reset();
		this.onPropertyChanged("range", this.range);
		this.onPropertyChanged("position", this.actualPosition);
		if (this.shadow && resetShadow) this.shadow.reset();
	}
	/**
	* Get this {@link PointLight} intensity.
	* @returns - The {@link PointLight} intensity.
	*/
	get intensity() {
		return super.intensity;
	}
	/**
	* Set this {@link PointLight} intensity and clear shadow if intensity is `0`.
	* @param value - The new {@link PointLight} intensity.
	*/
	set intensity(value) {
		super.intensity = value;
		if (this.shadow && this.shadow.isActive && !value) this.shadow.clearDepthTexture();
	}
	/**
	* Get this {@link PointLight} range.
	* @returns - The {@link PointLight} range.
	*/
	get range() {
		return this.#range;
	}
	/**
	* Set this {@link PointLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link PointLight} range.
	*/
	set range(value) {
		this.#range = Math.max(0, value);
		this.onPropertyChanged("range", this.range);
		if (this.shadow) this.shadow.camera.far = this.range ? this.range : this.shadow.options.camera.far;
	}
	/**
	* Set the {@link PointLight} position based on the {@link worldMatrix} translation.
	*/
	setPosition() {
		this.onPropertyChanged("position", this.actualPosition);
		if (this.shadow) this.shadow.setPosition();
	}
	/**
	* If the {@link modelMatrix | model matrix} has been updated, set the new position from the {@link worldMatrix} translation.
	*/
	updateMatrixStack() {
		super.updateMatrixStack();
		if (this.matricesNeedUpdate) this.setPosition();
	}
	/**
	* Tell the {@link renderer} that the maximum number of {@link PointLight} has been overflown.
	* @param lightsType - {@link type} of this light.
	*/
	onMaxLightOverflow(lightsType) {
		super.onMaxLightOverflow(lightsType);
		this.shadow?.setRendererBinding();
	}
	/**
	* Destroy this {@link PointLight} and associated {@link PointShadow}.
	*/
	destroy() {
		super.destroy();
		this.shadow?.destroy();
	}
};
//#endregion
export { PointLight };
