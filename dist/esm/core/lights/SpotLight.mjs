import { Quat } from "../../math/Quat.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
import { Light } from "./Light.mjs";
import { SpotShadow } from "../shadows/SpotShadow.mjs";
//#region src/core/lights/SpotLight.ts
const tempVec3 = new Vec3();
const tempQuat = new Quat();
const tempMat4 = new Mat4();
/**
* Create a spot light, that is emitted from a single point in one direction, along a cone that increases in size the further from the light it gets.
*
* This light can cast {@link SpotShadow}.
*
* @example
* ```javascript
* // assuming 'renderer' is a valid Camera renderer
*
* // this spot light will not cast any shadows
* const spotLight = new SpotLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(5, 2, 3),
*   penumbra: 0.5,
* })
*
* // this spot light will cast shadows
* const spotLightWithShadows = new SpotLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(-10, 10, -5),
*   target: new Vec3(0, 0.5, 0),
*   shadow: {
*     intensity: 1,
*   },
* })
*
* // this spot light will ALSO cast shadows!
* const anotherSpotLightWithShadows = new SpotLight(renderer, {
*   color: new Vec3(1),
*   intensity: 2,
*   position: new Vec3(12, 0.5, 5),
*   target: new Vec3(3),
*   shadow: {}, // that's enough to start casting shadows
* })
*
* // this spot light will cast shadows as well...
* const lastSpotLightWithShadows = new SpotLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(10),
* })
*
* // ... because we're telling it here to start casting shadows
* lastSpotLightWithShadows.shadow.cast()
* ```
*/
var SpotLight = class extends Light {
	/**
	* The {@link Vec3 | direction} of the {@link SpotLight} is the {@link target} minus the actual {@link position}.
	* @private
	*/
	#direction;
	/** @ignore */
	#angle;
	/** @ignore */
	#penumbra;
	/** @ignore */
	#range;
	/**
	* SpotLight constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotLight}.
	* @param parameters - {@link SpotLightBaseParams} used to create this {@link SpotLight}.
	*/
	constructor(renderer, { label = "SpotLight", color = new Vec3(1), intensity = 1, position = new Vec3(1), target = new Vec3(), angle = Math.PI / 3, penumbra = 0, range = 0, shadow = null } = {}) {
		super(renderer, {
			label,
			color,
			intensity,
			type: "spotLights"
		});
		this.options = {
			...this.options,
			position,
			range,
			angle,
			penumbra,
			target,
			shadow
		};
		this.#direction = new Vec3();
		this.position.copy(position);
		this.target = new Vec3();
		this.target.onChange(() => {
			this.lookAt(this.target);
		});
		this.target.copy(target);
		this.position.onChange(() => {
			this.lookAt(this.target);
		});
		if (this.target.lengthSq() === 0) this.lookAt(this.target);
		this.angle = angle;
		this.penumbra = penumbra;
		this.range = range;
		this.parent = this.renderer.scene;
		this.shadow = new SpotShadow(this.renderer, {
			autoRender: false,
			light: this
		});
		if (shadow) this.shadow.cast(shadow);
	}
	/**
	* Set or reset this {@link SpotLight} {@link CameraRenderer}.
	* @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
	*/
	setRenderer(renderer) {
		super.setRenderer(renderer);
		if (this.shadow) this.shadow.setRenderer(renderer);
	}
	/**
	* Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link SpotLight} has been overflowed or when updating the {@link SpotLight} {@link renderer}.
	* @param resetShadow - Whether to reset the {@link SpotLight} shadow if any. Set to `true` when the {@link renderer} number of {@link SpotLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
	*/
	reset(resetShadow = true) {
		super.reset();
		this.onPropertyChanged("range", this.range);
		this.onPropertyChanged("coneCos", Math.cos(this.angle));
		this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
		this.onPropertyChanged("position", this.actualPosition);
		this.onPropertyChanged("direction", this.#direction);
		if (this.shadow && resetShadow) this.shadow.reset();
	}
	/**
	* Get this {@link SpotLight} intensity.
	* @returns - The {@link SpotLight} intensity.
	*/
	get intensity() {
		return super.intensity;
	}
	/**
	* Set this {@link SpotLight} intensity and clear shadow if intensity is `0`.
	* @param value - The new {@link SpotLight} intensity.
	*/
	set intensity(value) {
		super.intensity = value;
		if (this.shadow && this.shadow.isActive && !value) this.shadow.clearDepthTexture();
	}
	/**
	* Set the {@link SpotLight} position and direction based on the {@link target} and the {@link worldMatrix} translation.
	*/
	setPositionDirection() {
		this.onPropertyChanged("position", this.actualPosition);
		this.#direction.copy(this.target).sub(this.actualPosition).normalize();
		this.onPropertyChanged("direction", this.#direction);
		if (this.shadow) this.shadow.setPosition();
	}
	/**
	* Update the {@link target} and therefore direction directly from the {@link worldMatrix}, in case a transformation (especially rotation) has been applied to a parent of this {@link SpotLight} instead of updating the {@link target} directly.
	*/
	updateTargetFromWorldMatrix() {
		tempVec3.set(1);
		this.worldMatrix.getScale(tempVec3);
		tempMat4.identity();
		for (const col of [
			0,
			1,
			2
		]) {
			tempMat4.elements[col] = this.worldMatrix.elements[col] / tempVec3.x;
			tempMat4.elements[col + 4] = this.worldMatrix.elements[col + 4] / tempVec3.y;
			tempMat4.elements[col + 8] = this.worldMatrix.elements[col + 8] / tempVec3.z;
		}
		tempMat4.getRotation(tempQuat);
		tempQuat.normalize();
		tempVec3.set(0, 0, -1);
		tempVec3.applyQuat(tempQuat);
		tempVec3.add(this.actualPosition);
		this.target._x = tempVec3.x;
		this.target._y = tempVec3.y;
		this.target._z = tempVec3.z;
		this.setPositionDirection();
	}
	/**
	* Get this {@link SpotLight} angle.
	* @returns - The {@link SpotLight} angle.
	*/
	get angle() {
		return this.#angle;
	}
	/**
	* Set this {@link SpotLight} angle and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link SpotLight} angle in the `[0, PI / 2]` range.
	*/
	set angle(value) {
		this.#angle = Math.min(Math.PI / 2, Math.max(0, value));
		this.onPropertyChanged("coneCos", Math.cos(this.angle));
		this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
		this.shadow?.setCameraFov();
	}
	/**
	* Get this {@link SpotLight} penumbra.
	* @returns - The {@link SpotLight} penumbra.
	*/
	get penumbra() {
		return this.#penumbra;
	}
	/**
	* Set this {@link SpotLight} penumbra and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link SpotLight} penumbra in the `[0, 1]` range.
	*/
	set penumbra(value) {
		this.#penumbra = Math.min(1, Math.max(0, value));
		this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
	}
	/**
	* Get this {@link SpotLight} range.
	* @returns - The {@link SpotLight} range.
	*/
	get range() {
		return this.#range;
	}
	/**
	* Set this {@link SpotLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link SpotLight} range.
	*/
	set range(value) {
		this.#range = Math.max(0, value);
		this.onPropertyChanged("range", this.range);
		if (this.shadow) this.shadow.camera.far = this.range ? this.range : this.shadow.options.camera.far;
	}
	/**
	* Rotate this {@link SpotLight} so it looks at the {@link Vec3 | target}.
	* @param target - {@link Vec3} to look at. Default to `new Vec3()`.
	*/
	lookAt(target = new Vec3()) {
		this.updateModelMatrix();
		this.updateWorldMatrix(true, false);
		if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) this.up.set(0, 0, 1);
		else this.up.set(0, 1, 0);
		this.applyLookAt(this.actualPosition, target);
	}
	/**
	* If the {@link modelMatrix | model matrix} has been updated, set the new position and direction from the {@link worldMatrix} translation.
	*/
	updateMatrixStack() {
		super.updateMatrixStack();
		if (this.matricesNeedUpdate) this.setPositionDirection();
	}
	/**
	* Tell the {@link renderer} that the maximum number of {@link SpotLight} has been overflown.
	* @param lightsType - {@link type} of this light.
	*/
	onMaxLightOverflow(lightsType) {
		super.onMaxLightOverflow(lightsType);
		this.shadow?.setRendererBinding();
	}
	/**
	* Destroy this {@link SpotLight} and associated {@link SpotShadow}.
	*/
	destroy() {
		super.destroy();
		this.shadow?.destroy();
	}
};
//#endregion
export { SpotLight };
