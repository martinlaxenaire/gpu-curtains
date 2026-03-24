import { Quat } from "../../math/Quat.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
//#region src/core/objects3D/Object3D.ts
let objectIndex = 0;
const tempMatrix = new Mat4();
/**
* Used to create an object with transformation properties such as position, scale, rotation and transform origin {@link Vec3 | vectors} and a {@link Quat | quaternion} in order to compute the {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix}.
*
* If an {@link Object3D} does not have any {@link Object3D#parent | parent}, then its {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix} are the same.
*
* The transformations {@link Vec3 | vectors} are reactive to changes, which mean that updating one of their components will automatically update the {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix}.
*/
var Object3D = class {
	/** Parent {@link Object3D} in the scene graph, used to compute the {@link worldMatrix}. */
	#parent;
	/** Whether this {@link Object3D} and all its {@link children} should be considered as visible. Default to `true`. */
	#visible;
	/** Set to `false` if at least one of the {@link Object3D} parent is not visible. */
	#parentVisibility;
	/**
	* Object3D constructor
	*/
	constructor() {
		this.#parent = null;
		this.children = [];
		this.matricesNeedUpdate = false;
		this.up = new Vec3(0, 1, 0);
		this.actualPosition = new Vec3();
		Object.defineProperty(this, "object3DIndex", { value: objectIndex++ });
		this.setMatrices();
		this.setTransforms();
		this.#visible = true;
		this.#parentVisibility = true;
	}
	/**
	* Get whether this {@link Object3D} is visible (if it is itself visible, and all its parents are visible as well).
	*/
	get visible() {
		return this.#visible && this.#parentVisibility;
	}
	/**
	* Set this {@link Object3D} visible property, and its children `parentVisibility` property.
	* @param value - New visibility value.
	*/
	set visible(value) {
		this.#visible = value;
		this.children.forEach((c) => c.parentVisibility = this.parentVisibility && value);
	}
	/**
	* Get whether all this {@link Object3D} parents are visible or not. Should not be used directly.
	*/
	get parentVisibility() {
		return this.#parentVisibility;
	}
	/**
	* Set to `false` if at least one of this {@link Object3D} parent is not visible, `true` otherwise. Should not be used directly.
	* @param value - New parent visibility value.
	*/
	set parentVisibility(value) {
		this.#parentVisibility = value;
		this.children.forEach((child) => child.parentVisibility = this.visible && value);
	}
	/**
	* Get the parent of this {@link Object3D} if any
	*/
	get parent() {
		return this.#parent;
	}
	/**
	* Set the parent of this {@link Object3D}
	* @param value - new parent to set, could be an {@link Object3D} or null
	*/
	set parent(value) {
		if (this.#parent && value && this.#parent.object3DIndex === value.object3DIndex) return;
		if (this.#parent) this.#parent.children = this.#parent.children.filter((child) => child.object3DIndex !== this.object3DIndex);
		if (value) this.shouldUpdateWorldMatrix();
		this.#parent = value;
		this.#parent?.children.push(this);
		this.parentVisibility = this.#parent ? this.#parent.visible : true;
	}
	/**
	* Set our transforms properties and {@link Vec3#onChange | vectors onChange} callbacks
	*/
	setTransforms() {
		this.transforms = {
			origin: { model: new Vec3() },
			quaternion: new Quat(),
			rotation: new Vec3(),
			position: { world: new Vec3() },
			scale: new Vec3(1)
		};
		this.rotation.onChange(() => this.applyRotation());
		this.position.onChange(() => this.applyPosition());
		this.scale.onChange(() => this.applyScale());
		this.transformOrigin.onChange(() => this.applyTransformOrigin());
	}
	/**
	* Get our rotation {@link Vec3 | vector}
	*/
	get rotation() {
		return this.transforms.rotation;
	}
	/**
	* Set our rotation {@link Vec3 | vector}
	* @param value - new rotation {@link Vec3 | vector}
	*/
	set rotation(value) {
		this.transforms.rotation = value;
		this.applyRotation();
	}
	/**
	* Get our {@link Quat | quaternion}
	*/
	get quaternion() {
		return this.transforms.quaternion;
	}
	/**
	* Set our {@link Quat | quaternion}
	* @param value - new {@link Quat | quaternion}
	*/
	set quaternion(value) {
		this.transforms.quaternion = value;
	}
	/**
	* Get our position {@link Vec3 | vector}
	*/
	get position() {
		return this.transforms.position.world;
	}
	/**
	* Set our position {@link Vec3 | vector}
	* @param value - new position {@link Vec3 | vector}
	*/
	set position(value) {
		this.transforms.position.world = value;
	}
	/**
	* Get our scale {@link Vec3 | vector}
	*/
	get scale() {
		return this.transforms.scale;
	}
	/**
	* Set our scale {@link Vec3 | vector}
	* @param value - new scale {@link Vec3 | vector}
	*/
	set scale(value) {
		this.transforms.scale = value;
		this.applyScale();
	}
	/**
	* Get our transform origin {@link Vec3 | vector}
	*/
	get transformOrigin() {
		return this.transforms.origin.model;
	}
	/**
	* Set our transform origin {@link Vec3 | vector}
	* @param value - new transform origin {@link Vec3 | vector}
	*/
	set transformOrigin(value) {
		this.transforms.origin.model = value;
	}
	/**
	* Apply our rotation and tell our {@link modelMatrix | model matrix} to update
	*/
	applyRotation() {
		this.quaternion.setFromVec3(this.rotation);
		this.shouldUpdateModelMatrix();
	}
	/**
	* Tell our {@link modelMatrix | model matrix} to update
	*/
	applyPosition() {
		this.shouldUpdateModelMatrix();
	}
	/**
	* Tell our {@link modelMatrix | model matrix} to update
	*/
	applyScale() {
		this.shouldUpdateModelMatrix();
	}
	/**
	* Tell our {@link modelMatrix | model matrix} to update
	*/
	applyTransformOrigin() {
		this.shouldUpdateModelMatrix();
	}
	/**
	* Set our {@link modelMatrix | model matrix} and {@link worldMatrix | world matrix}
	*/
	setMatrices() {
		this.matrices = {
			model: {
				matrix: new Mat4(),
				shouldUpdate: true,
				onUpdate: () => this.updateModelMatrix()
			},
			world: {
				matrix: new Mat4(),
				shouldUpdate: true,
				onUpdate: () => this.updateWorldMatrix()
			}
		};
	}
	/**
	* Get our {@link Mat4 | model matrix}
	*/
	get modelMatrix() {
		return this.matrices.model.matrix;
	}
	/**
	* Set our {@link Mat4 | model matrix}
	* @param value - new {@link Mat4 | model matrix}
	*/
	set modelMatrix(value) {
		this.matrices.model.matrix = value;
		this.shouldUpdateModelMatrix();
	}
	/**
	* Set our {@link modelMatrix | model matrix} shouldUpdate flag to true (tell it to update)
	*/
	shouldUpdateModelMatrix() {
		this.matrices.model.shouldUpdate = true;
		this.shouldUpdateWorldMatrix();
	}
	/**
	* Get our {@link Mat4 | world matrix}
	*/
	get worldMatrix() {
		return this.matrices.world.matrix;
	}
	/**
	* Set our {@link Mat4 | world matrix}
	* @param value - new {@link Mat4 | world matrix}
	*/
	set worldMatrix(value) {
		this.matrices.world.matrix = value;
		this.shouldUpdateWorldMatrix();
	}
	/**
	* Set our {@link worldMatrix | world matrix} shouldUpdate flag to true (tell it to update)
	*/
	shouldUpdateWorldMatrix() {
		this.matrices.world.shouldUpdate = true;
	}
	/**
	* Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}.
	* @param target - {@link Vec3} to look at. Default to `new Vec3()`.
	*/
	lookAt(target = new Vec3()) {
		this.updateModelMatrix();
		this.updateWorldMatrix(true, false);
		if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) this.up.set(0, 0, 1);
		else this.up.set(0, 1, 0);
		this.applyLookAt(target, this.actualPosition);
	}
	/**
	* Apply a look at rotation based on a target, a position and our {@link up} vectors.
	* @param target - {@link Vec3} target to look at.
	* @param position - {@link Vec3} position from which to look at.
	*/
	applyLookAt(target, position) {
		const rotation = tempMatrix.lookAt(target, position, this.up);
		this.quaternion.setFromRotationMatrix(rotation);
		this.shouldUpdateModelMatrix();
	}
	/**
	* Update our {@link modelMatrix | model matrix}
	*/
	updateModelMatrix() {
		this.modelMatrix = this.modelMatrix.composeFromOrigin(this.position, this.quaternion, this.scale, this.transformOrigin);
		this.shouldUpdateWorldMatrix();
	}
	/**
	* Update our {@link worldMatrix | model matrix}.
	* @param updateParents - Whether to update the {@link parent} {@link worldMatrix} beforehand. Default to `false`.
	* @param updateChildren - Whether to update the {@link children} {@link worldMatrix} afterward. Default to `true`.
	*/
	updateWorldMatrix(updateParents = false, updateChildren = true) {
		if (!this.parent) this.worldMatrix.copy(this.modelMatrix);
		else {
			if (updateParents) this.parent.updateWorldMatrix(true, false);
			this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.modelMatrix);
		}
		this.worldMatrix.getTranslation(this.actualPosition);
		if (updateChildren) for (let i = 0, l = this.children.length; i < l; i++) this.children[i].shouldUpdateWorldMatrix();
	}
	/**
	* Check whether at least one of the matrix should be updated
	*/
	shouldUpdateMatrices() {
		this.matricesNeedUpdate = !!Object.values(this.matrices).find((matrix) => matrix.shouldUpdate);
	}
	/**
	* Check at each render whether we should update our matrices, and update them if needed
	*/
	updateMatrixStack() {
		this.shouldUpdateMatrices();
		if (this.matricesNeedUpdate) {
			for (const matrixName in this.matrices) if (this.matrices[matrixName].shouldUpdate) {
				this.matrices[matrixName].onUpdate();
				this.matrices[matrixName].shouldUpdate = false;
			}
		}
		for (let i = 0, l = this.children.length; i < l; i++) this.children[i].updateMatrixStack();
	}
	/**
	* Destroy this {@link Object3D}. Removes its parent and set its children free.
	*/
	destroy() {
		for (let i = 0, l = this.children.length; i < l; i++) if (this.children[i]) this.children[i].parent = null;
		this.parent = null;
	}
};
//#endregion
export { Object3D };
