import { Quat } from "../../math/Quat.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
import { Light } from "./Light.mjs";
import { DirectionalShadow } from "../shadows/DirectionalShadow.mjs";
//#region src/core/lights/DirectionalLight.ts
const tempVec3 = new Vec3();
const tempQuat = new Quat();
const tempMat4 = new Mat4();
/**
* Create a directional light, that is emitted in a single direction without any attenuation. A common use case for this type of light is to simulate the sun.
*
* This light can cast {@link DirectionalShadow}.
*
* @example
* ```javascript
* // assuming 'renderer' is a valid Camera renderer
*
* // this directional light will not cast any shadows
* const directionalLight = new DirectionalLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(5, 2, 3),
* })
*
* // this directional light will cast shadows
* const directionalLightWithShadows = new DirectionalLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(-10, 10, -5),
*   shadow: {
*     intensity: 1,
*   },
* })
*
* // this directional light will ALSO cast shadows!
* const anotherDirectionalLightWithShadows = new DirectionalLight(renderer, {
*   color: new Vec3(1),
*   intensity: 2,
*   position: new Vec3(12, 0.5, 5),
*   target: new Vec3(3),
*   shadow: {}, // that's enough to start casting shadows
* })
*
* // this directional light will cast shadows as well...
* const lastDirectionalLightWithShadows = new DirectionalLight(renderer, {
*   color: new Vec3(1),
*   intensity: 1,
*   position: new Vec3(10),
* })
*
* // ... because we're telling it here to start casting shadows
* lastDirectionalLightWithShadows.shadow.cast()
* ```
*/
var DirectionalLight = class extends Light {
	/**
	* The {@link Vec3 | direction} of the {@link DirectionalLight} is the {@link target} minus the actual {@link position}.
	* @private
	*/
	#direction;
	/**
	* DirectionalLight constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalLight}.
	* @param parameters - {@link DirectionalLightBaseParams} used to create this {@link DirectionalLight}.
	*/
	constructor(renderer, { label = "DirectionalLight", color = new Vec3(1), intensity = 1, position = new Vec3(1), target = new Vec3(), shadow = null } = {}) {
		super(renderer, {
			label,
			color,
			intensity,
			type: "directionalLights"
		});
		this.options = {
			...this.options,
			position,
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
		this.parent = this.renderer.scene;
		this.shadow = new DirectionalShadow(this.renderer, {
			autoRender: false,
			light: this
		});
		if (shadow) this.shadow.cast(shadow);
	}
	/**
	* Set or reset this {@link DirectionalLight} {@link CameraRenderer}.
	* @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
	*/
	setRenderer(renderer) {
		super.setRenderer(renderer);
		if (this.shadow) this.shadow.setRenderer(renderer);
	}
	/**
	* Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed or when updating the {@link DirectionalLight} {@link renderer}.
	* @param resetShadow - Whether to reset the {@link DirectionalLight} shadow if any. Set to `true` when the {@link renderer} number of {@link DirectionalLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
	*/
	reset(resetShadow = true) {
		super.reset();
		this.onPropertyChanged("direction", this.#direction);
		if (this.shadow && resetShadow) this.shadow.reset();
	}
	/**
	* Get this {@link DirectionalLight} intensity.
	* @returns - The {@link DirectionalLight} intensity.
	*/
	get intensity() {
		return super.intensity;
	}
	/**
	* Set this {@link DirectionalLight} intensity and clear shadow if intensity is `0`.
	* @param value - The new {@link DirectionalLight} intensity.
	*/
	set intensity(value) {
		super.intensity = value;
		if (this.shadow && this.shadow.isActive && !value) this.shadow.clearDepthTexture();
	}
	/**
	* Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation.
	*/
	setDirection() {
		this.#direction.copy(this.target).sub(this.actualPosition).normalize();
		this.onPropertyChanged("direction", this.#direction);
		if (this.shadow) this.shadow.setDirection(this.#direction);
	}
	/**
	* Rotate this {@link DirectionalLight} so it looks at the {@link Vec3 | target}.
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
	* Update the {@link target} and therefore direction directly from the {@link worldMatrix}, in case a transformation (especially rotation) has been applied to a parent of this {@link DirectionalLight} instead of updating the {@link target} directly.
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
		this.setDirection();
	}
	/**
	* If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
	*/
	updateMatrixStack() {
		super.updateMatrixStack();
		if (this.matricesNeedUpdate) this.setDirection();
	}
	/**
	* Tell the {@link renderer} that the maximum number of {@link DirectionalLight} has been overflown.
	* @param lightsType - {@link type} of this light.
	*/
	onMaxLightOverflow(lightsType) {
		super.onMaxLightOverflow(lightsType);
		this.shadow?.setRendererBinding();
	}
	/**
	* Destroy this {@link DirectionalLight} and associated {@link DirectionalShadow}.
	*/
	destroy() {
		super.destroy();
		this.shadow?.destroy();
	}
};
//#endregion
export { DirectionalLight };
