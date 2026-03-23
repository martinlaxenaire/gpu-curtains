import { generateUUID } from "../../utils/utils.mjs";
import { isRenderer } from "../../core/renderers/utils.mjs";
//#region src/extras/animations/TargetsAnimationsManager.ts
/**
* Class used to help synchronize and run {@link KeyframesAnimation} for a given list of {@link Object3D}. Mostly used internally when loading glTF files, but could be used externally as well.
*/
var TargetsAnimationsManager = class {
	/** @ignore */
	#startTime;
	/** @ignore */
	#currentTime;
	/** @ignore */
	#deltaTime;
	/** @ignore */
	#count;
	/** @ignore */
	#maxCount;
	/**
	* TargetsAnimationsManager constructor
	* @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link TargetsAnimationsManager}.
	* @param parameters - {@link TargetsAnimationsManagerParams | parameters} used to create this {@link TargetsAnimationsManager}.
	*/
	constructor(renderer, { label = "", targets = [] } = {}) {
		this.uuid = generateUUID();
		this.inputIndices = [];
		this.setRenderer(renderer);
		this.label = label;
		this.targets = [];
		this.duration = 0;
		this.timeScale = 1;
		this.#startTime = performance.now();
		this.#currentTime = performance.now();
		this.#deltaTime = 0;
		this.#count = 0;
		this.#count = 0;
		this.#maxCount = Infinity;
		this.isPlaying = false;
		this.siblings = /* @__PURE__ */ new Map();
		if (targets && targets.length) this.targets = [...this.targets, ...targets];
	}
	/**
	* Set the current {@link TargetsAnimationsManager.renderer | renderer} to use with this {@link TargetsAnimationsManager}. Can be set to `null` to detach from the current {@link TargetsAnimationsManager.renderer | renderer}.
	* @param renderer
	*/
	setRenderer(renderer) {
		if (this.renderer) {
			this.renderer.animations.delete(this.uuid);
			this.renderer.animations.forEach((animation) => animation.siblings.delete(this.uuid));
		}
		if (renderer) {
			renderer = isRenderer(renderer, "TargetsAnimationsManager");
			this.renderer = renderer;
			this.renderer.animations.set(this.uuid, this);
			if (this.inputIndices.length) this.#setSiblings();
		}
	}
	/**
	* Add a new {@link Target} to the {@link targets} array based on an {@link Object3D}.
	* @param object - {@link Object3D} to use for the {@link Target}.
	*/
	addTarget(object) {
		const target = {
			object,
			animations: []
		};
		this.targets.push(target);
		return target;
	}
	/**
	* Add new {@link Target | targets} to the {@link targets} array based on an array of {@link Object3D}.
	* @param objects - array of {@link Object3D} to use for the {@link Target | targets}.
	*/
	addTargets(objects) {
		objects.forEach((object) => this.addTarget(object));
	}
	/**
	* Add a {@link KeyframesAnimation} to a {@link Target#animations | target animations} array based on an {@link Object3D}.
	* @param object - {@link Object3D} to use for the {@link Target}.
	* @param animation - {@link KeyframesAnimation} to add.
	*/
	addTargetAnimation(object, animation) {
		this.duration = Math.max(this.duration, animation.duration);
		let target = this.getTargetByObject3D(object);
		if (!target) target = this.addTarget(object);
		target.animations.push(animation);
		if (animation.inputIndex !== null && !this.inputIndices.includes(animation.inputIndex)) this.inputIndices.push(animation.inputIndex);
		this.#setSiblings();
	}
	/**
	* Set the {@link TargetsAnimationsManager} siblings by comparing {@link inputIndices} arrays.
	* @private
	*/
	#setSiblings() {
		this.siblings = /* @__PURE__ */ new Map();
		this.renderer.animations.forEach((animation) => {
			if (animation.uuid !== this.uuid && JSON.stringify(animation.inputIndices) === JSON.stringify(this.inputIndices)) {
				this.siblings.set(animation.uuid, animation);
				animation.siblings.set(this.uuid, this);
			} else animation.siblings.delete(this.uuid);
		});
	}
	/**
	* Get a {@link Target} from the {@link targets} array based on an {@link Object3D}.
	* @param object - {@link Object3D} to use to find the {@link Target}.
	* @returns - {@link Target} found if any.
	*/
	getTargetByObject3D(object) {
		return this.targets.find((target) => target.object.object3DIndex === object.object3DIndex);
	}
	/**
	* Get the first animation from the {@link targets} array that matches the {@link Object3D} and {@link KeyframesAnimation#path | path} given.
	* @param object - {@link Object3D} to use to find the {@link KeyframesAnimation}.
	* @param path - {@link KeyframesAnimation#path | path} to use to find the {@link KeyframesAnimation}.
	* @returns - {@link KeyframesAnimation} found if any.
	*/
	getAnimationByObject3DAndPath(object, path) {
		const target = this.getTargetByObject3D(object);
		if (target) return target.animations.find((animation) => animation.path === path);
		else return null;
	}
	/**
	* Play or resume the {@link TargetsAnimationsManager}.
	*/
	play() {
		this.isPlaying = true;
	}
	/**
	* Play the {@link TargetsAnimationsManager} once.
	*/
	playOnce() {
		this.#maxCount = 1;
		this.play();
	}
	/**
	* Pause the {@link TargetsAnimationsManager}.
	*/
	pause() {
		this.isPlaying = false;
		this.#startTime = -1;
	}
	/**
	* Stop the {@link TargetsAnimationsManager} and reset all the animations values to last keyframe.
	*/
	stop() {
		this.isPlaying = false;
		this.#count = 0;
		if (!this.siblings.size) this.#startTime = 0;
		this.targets.forEach((target) => target.animations.forEach((animation) => animation.update(target.object, Math.min(animation.duration, this.duration))));
		this.renderer.onAfterRenderScene.add(() => {
			this.targets.forEach((target) => {
				target.animations.forEach((animation) => {
					if (animation.onAfterUpdate) animation.onAfterUpdate();
				});
			});
		}, { once: true });
	}
	/**
	* {@link stop | Stop} the {@link TargetsAnimationsManager} at the end of the next animation loop.
	*/
	stopAtEndOfLoop() {
		this.#maxCount = this.#count + 1;
	}
	/**
	* Update all the {@link targets} animations.
	*/
	update() {
		if (!this.isPlaying) return;
		if (this.#startTime === -1) this.#startTime = performance.now() - this.#deltaTime;
		else if (this.#startTime === 0) this.#startTime = performance.now();
		this.#currentTime = performance.now();
		this.#deltaTime = this.#currentTime - this.#startTime;
		const time = this.#deltaTime * this.timeScale / 1e3;
		const currentTime = time % this.duration;
		this.#count = Math.floor(time / this.duration);
		if (this.#count >= this.#maxCount) {
			this.stop();
			return;
		}
		this.targets.forEach((target) => target.animations.forEach((animation) => animation.update(target.object, currentTime)));
	}
	/**
	* Call all the {@link targets} animations {@link KeyframesAnimation#onAfterUpdate | onAfterUpdate} callbacks.
	*/
	onAfterUpdate() {
		if (!this.isPlaying) return;
		this.targets.forEach((target) => target.animations.forEach((animation) => {
			if (animation.onAfterUpdate) animation.onAfterUpdate();
		}));
	}
};
//#endregion
export { TargetsAnimationsManager };
