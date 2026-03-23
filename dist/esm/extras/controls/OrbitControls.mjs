import { throwWarning } from "../../utils/utils.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
import { OrthographicCamera } from "../../core/cameras/OrthographicCamera.mjs";
import { PerspectiveCamera } from "../../core/cameras/PerspectiveCamera.mjs";
//#region src/extras/controls/OrbitControls.ts
const tempVec2a = new Vec2();
const tempVec2b = new Vec2();
const tempVec3 = new Vec3();
/**
* Helper to create orbit camera controls (sometimes called arc ball camera).
*
* @example
* ```javascript
* // assuming renderer is a valid CameraRenderer
* const { camera } = renderer
* const orbitControls = new OrbitControls({ camera })
* ```
*/
var OrbitControls = class {
	/**
	* {@link HTMLElement} (or {@link Window} element) to use for event listeners.
	* @private
	*/
	#element = null;
	/** @ignore */
	#offset = new Vec3();
	/** @ignore */
	#pinchDist;
	/** @ignore */
	#isOrbiting = false;
	/** @ignore */
	#spherical = {
		radius: 1,
		phi: 0,
		theta: 0
	};
	/** @ignore */
	#rotateStart = new Vec2();
	/** @ignore */
	#isPaning = false;
	/** @ignore */
	#panStart = new Vec2();
	/** @ignore */
	#panDelta = new Vec3();
	/** @ignore */
	#_onContextMenu;
	/** @ignore */
	#_onMouseDown;
	/** @ignore */
	#_onMouseMove;
	/** @ignore */
	#_onMouseUp;
	/** @ignore */
	#_onTouchStart;
	/** @ignore */
	#_onTouchMove;
	/** @ignore */
	#_onTouchEnd;
	/** @ignore */
	#_onMouseWheel;
	/**
	* OrbitControls constructor
	* @param parameters - parameters to use.
	*/
	constructor({ camera, element = null, target = new Vec3(), enableZoom = true, minZoom = 0, maxZoom = Infinity, zoomSpeed = 1, enableRotate = true, minPolarAngle = 0, maxPolarAngle = Math.PI, minAzimuthAngle = -Infinity, maxAzimuthAngle = Infinity, rotateSpeed = 1, enablePan = true, panSpeed = 1 }) {
		if (!camera) {
			throwWarning("OrbitControls: cannot initialize without a camera.");
			return;
		}
		this.enabled = true;
		this.#setBaseParams({
			target,
			enableZoom,
			minZoom,
			maxZoom,
			zoomSpeed,
			enableRotate,
			minPolarAngle,
			maxPolarAngle,
			minAzimuthAngle,
			maxAzimuthAngle,
			rotateSpeed,
			enablePan,
			panSpeed
		});
		this.#_onContextMenu = this.#onContextMenu.bind(this);
		this.#_onMouseDown = this.#onMouseDown.bind(this);
		this.#_onMouseMove = this.#onMouseMove.bind(this);
		this.#_onMouseUp = this.#onMouseUp.bind(this);
		this.#_onTouchStart = this.#onTouchStart.bind(this);
		this.#_onTouchMove = this.#onTouchMove.bind(this);
		this.#_onTouchEnd = this.#onTouchEnd.bind(this);
		this.#_onMouseWheel = this.#onMouseWheel.bind(this);
		this.element = element ?? (typeof window !== "undefined" ? window : null);
		this.useCamera(camera);
	}
	/**
	* Allow to set or reset this {@link OrbitControls.camera | OrbitControls camera}.
	* @param camera - New {@link OrbitControls.camera | camera} to use.
	*/
	useCamera(camera) {
		this.camera = camera;
		this.camera.lookAt(this.target);
		this.target.onChange(() => {
			this.#update();
		});
		this.#offset.copy(this.camera.position).sub(this.target);
		this.#spherical.radius = this.#offset.length();
		this.#spherical.theta = Math.atan2(this.#offset.x, this.#offset.z);
		this.#spherical.phi = Math.acos(Math.min(Math.max(this.#offset.y / this.#spherical.radius, -1), 1));
		this.#update();
	}
	/**
	* Set / reset base params
	* @ignore
	*/
	#setBaseParams({ target, enableZoom = this.enableZoom, minZoom = this.minZoom, maxZoom = this.maxZoom, zoomSpeed = this.zoomSpeed, enableRotate = this.enableRotate, minPolarAngle = this.minPolarAngle, maxPolarAngle = this.maxPolarAngle, minAzimuthAngle = this.minAzimuthAngle, maxAzimuthAngle = this.maxAzimuthAngle, rotateSpeed = this.rotateSpeed, enablePan = this.enablePan, panSpeed = this.panSpeed } = {}) {
		if (target) this.target = target;
		this.enableZoom = enableZoom;
		this.minZoom = minZoom;
		this.maxZoom = maxZoom;
		this.zoomSpeed = zoomSpeed;
		this.enableRotate = enableRotate;
		this.minPolarAngle = minPolarAngle;
		this.maxPolarAngle = maxPolarAngle;
		this.minAzimuthAngle = minAzimuthAngle;
		this.maxAzimuthAngle = maxAzimuthAngle;
		this.rotateSpeed = rotateSpeed;
		this.enablePan = enablePan;
		this.panSpeed = panSpeed;
	}
	/**
	* Reset the {@link OrbitControls} values.
	* @param parameters - Parameters used to reset the values. Those are the same as {@link OrbitControlsBaseParams} with an additional position parameter to allow to override the {@link OrbitControls} position.
	*/
	reset({ position, target, enableZoom = this.enableZoom, minZoom = this.minZoom, maxZoom = this.maxZoom, zoomSpeed = this.zoomSpeed, enableRotate = this.enableRotate, minPolarAngle = this.minPolarAngle, maxPolarAngle = this.maxPolarAngle, minAzimuthAngle = this.minAzimuthAngle, maxAzimuthAngle = this.maxAzimuthAngle, rotateSpeed = this.rotateSpeed, enablePan = this.enablePan, panSpeed = this.panSpeed } = {}) {
		this.#setBaseParams({
			target,
			enableZoom,
			minZoom,
			maxZoom,
			zoomSpeed,
			enableRotate,
			minPolarAngle,
			maxPolarAngle,
			minAzimuthAngle,
			maxAzimuthAngle,
			rotateSpeed,
			enablePan,
			panSpeed
		});
		if (position) this.updatePosition(position);
	}
	/**
	* Allow to override the {@link camera} position.
	* @param position - new {@link camera} position to set.
	*/
	updatePosition(position = new Vec3()) {
		position.sub(this.target);
		this.#spherical.radius = position.length();
		this.#spherical.theta = Math.atan2(position.x, position.z);
		this.#spherical.phi = Math.acos(Math.min(Math.max(position.y / this.#spherical.radius, -1), 1));
		this.#update();
	}
	/**
	* Set the element to use for event listeners. Can remove previous event listeners first if needed.
	* @param value - {@link HTMLElement} (or {@link Window} element) to use.
	*/
	set element(value) {
		if (this.#element && (!value || this.#element !== value)) this.#removeEvents();
		this.#element = value;
		if (value) this.#addEvents();
	}
	/**
	* Get our element to use for event listeners.
	* @returns - {@link HTMLElement} (or {@link Window} element) used.
	*/
	get element() {
		return this.#element;
	}
	/**
	* Add the event listeners.
	* @private
	*/
	#addEvents() {
		this.#element.addEventListener("contextmenu", this.#_onContextMenu, false);
		this.#element.addEventListener("mousedown", this.#_onMouseDown, false);
		this.#element.addEventListener("mousemove", this.#_onMouseMove, false);
		this.#element.addEventListener("mouseup", this.#_onMouseUp, false);
		this.#element.addEventListener("touchstart", this.#_onTouchStart, { passive: false });
		this.#element.addEventListener("touchmove", this.#_onTouchMove, { passive: false });
		this.#element.addEventListener("touchend", this.#_onTouchEnd, false);
		this.#element.addEventListener("wheel", this.#_onMouseWheel, { passive: false });
	}
	/**
	* Remove the event listeners.
	* @private
	*/
	#removeEvents() {
		this.#element.removeEventListener("contextmenu", this.#_onContextMenu, false);
		this.#element.removeEventListener("mousedown", this.#_onMouseDown, false);
		this.#element.removeEventListener("mousemove", this.#_onMouseMove, false);
		this.#element.removeEventListener("mouseup", this.#_onMouseUp, false);
		this.#element.removeEventListener("touchstart", this.#_onTouchStart, { passive: false });
		this.#element.removeEventListener("touchmove", this.#_onTouchMove, { passive: false });
		this.#element.removeEventListener("touchend", this.#_onTouchEnd, false);
		this.#element.removeEventListener("wheel", this.#_onMouseWheel, { passive: false });
	}
	/**
	* Callback executed on mouse down event.
	* @param e - {@link MouseEvent}.
	* @private
	*/
	#onMouseDown(e) {
		if (!this.enabled) return;
		if (e.button === 0 && this.enableRotate) {
			this.#isOrbiting = true;
			this.#rotateStart.set(e.clientX, e.clientY);
		} else if (e.button === 2 && this.enablePan) {
			this.#isPaning = true;
			this.#panStart.set(e.clientX, e.clientY);
		}
		e.stopPropagation();
		e.preventDefault();
	}
	/**
	* Callback executed on touch start event.
	* @param e - {@link TouchEvent}.
	* @private
	*/
	#onTouchStart(e) {
		if (!this.enabled) return;
		this.#pinchDist = 0;
		if (e.touches.length === 1 && this.enableRotate) {
			this.#isOrbiting = true;
			this.#rotateStart.set(e.touches[0].clientX, e.touches[0].clientY);
		}
	}
	/**
	* Callback executed on mouse move event.
	* @param e - {@link MouseEvent}.
	*/
	#onMouseMove(e) {
		if (!this.enabled) return;
		if (this.#isOrbiting && this.enableRotate) this.#rotate(e.clientX, e.clientY);
		else if (this.#isPaning && this.enablePan) this.#pan(e.clientX, e.clientY);
	}
	/**
	* Callback executed on touch move event.
	* @param e - {@link TouchEvent}.
	* @private
	*/
	#onTouchMove(e) {
		if (!this.enabled) return;
		if (e.touches.length === 2 && this.enableZoom) {
			const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
			if (this.#pinchDist) {
				const zoom = this.#pinchDist - dist;
				if (zoom) this.#zoom(zoom * 2);
			}
			this.#pinchDist = dist;
		} else if (this.#isOrbiting && this.enableRotate) this.#rotate(e.touches[0].pageX, e.touches[0].pageY);
	}
	/**
	* Callback executed on mouse up event.
	* @param e - {@link MouseEvent}.
	* @private
	*/
	#onMouseUp(e) {
		this.#isOrbiting = false;
		this.#isPaning = false;
	}
	/**
	* Callback executed on touch end event.
	* @param e - {@link MouseEvent}.
	* @private
	*/
	#onTouchEnd(e) {
		this.#isOrbiting = false;
		this.#isPaning = false;
	}
	/**
	* Callback executed on wheel event.
	* @param e - {@link WheelEvent}.
	* @private
	*/
	#onMouseWheel(e) {
		if (this.enabled && this.enableZoom) {
			this.#zoom(e.deltaY);
			e.preventDefault();
		}
	}
	/**
	* Prevent context menu apparition on right click
	* @param e - {@link MouseEvent}.
	* @private
	*/
	#onContextMenu(e) {
		if (!this.enabled) return;
		e.preventDefault();
	}
	/**
	* Update the {@link camera} position based on the {@link target} and internal values.
	* @private
	*/
	#update() {
		const sinPhiRadius = this.#spherical.radius * Math.sin(Math.max(1e-6, this.#spherical.phi));
		this.#offset.x = sinPhiRadius * Math.sin(this.#spherical.theta);
		this.#offset.y = this.#spherical.radius * Math.cos(this.#spherical.phi);
		this.#offset.z = sinPhiRadius * Math.cos(this.#spherical.theta);
		this.camera.position.copy(this.target).add(this.#offset);
		this.camera.lookAt(this.target);
	}
	/**
	* Update the {@link camera} position based on input coordinates so it rotates around the {@link target}.
	* @param x - input coordinate along the X axis.
	* @param y - input coordinate along the Y axis.
	* @private
	*/
	#rotate(x, y) {
		tempVec2a.set(x, y);
		tempVec2b.copy(tempVec2a).sub(this.#rotateStart).multiplyScalar(this.rotateSpeed);
		if (this.camera instanceof PerspectiveCamera) {
			this.#spherical.theta -= 2 * Math.PI * tempVec2b.x / this.camera.size.height;
			this.#spherical.phi -= 2 * Math.PI * tempVec2b.y / this.camera.size.height;
		} else if (this.camera instanceof OrthographicCamera) {
			const height = (this.camera.top - this.camera.bottom) * 2;
			tempVec2b.multiplyScalar(1 / height);
			this.#spherical.theta -= 2 * Math.PI * tempVec2b.x / height;
			this.#spherical.phi -= 2 * Math.PI * tempVec2b.y / height;
		}
		this.#spherical.theta = Math.min(this.maxAzimuthAngle, Math.max(this.minAzimuthAngle, this.#spherical.theta));
		this.#spherical.phi = Math.min(this.maxPolarAngle, Math.max(this.minPolarAngle, this.#spherical.phi));
		this.#rotateStart.copy(tempVec2a);
		this.#update();
	}
	/**
	* Pan the {@link camera} position based on input coordinates by updating {@link target}.
	* @param x - input coordinate along the X axis.
	* @param y - input coordinate along the Y axis.
	* @private
	*/
	#pan(x, y) {
		tempVec2a.set(x, y);
		tempVec2b.copy(tempVec2a).sub(this.#panStart).multiplyScalar(this.panSpeed);
		this.#panDelta.set(0);
		tempVec3.copy(this.camera.position).sub(this.target);
		let targetDistance = tempVec3.length();
		tempVec3.set(this.camera.modelMatrix.elements[0], this.camera.modelMatrix.elements[1], this.camera.modelMatrix.elements[2]);
		if (this.camera instanceof PerspectiveCamera) {
			targetDistance *= Math.tan(this.camera.fov / 2 * Math.PI / 180);
			tempVec3.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / this.camera.size.height);
		} else if (this.camera instanceof OrthographicCamera) {
			targetDistance *= 1 / ((this.camera.top - this.camera.bottom) * 2);
			tempVec3.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / ((this.camera.right - this.camera.left) * 2));
		}
		this.#panDelta.add(tempVec3);
		tempVec3.set(this.camera.modelMatrix.elements[4], this.camera.modelMatrix.elements[5], this.camera.modelMatrix.elements[6]);
		if (this.camera instanceof PerspectiveCamera) tempVec3.multiplyScalar(2 * tempVec2b.y * targetDistance / this.camera.size.height);
		else if (this.camera instanceof OrthographicCamera) tempVec3.multiplyScalar(2 * tempVec2b.y * targetDistance / ((this.camera.top - this.camera.bottom) * 2));
		this.#panDelta.add(tempVec3);
		this.#panStart.copy(tempVec2a);
		this.target.add(this.#panDelta);
		this.#offset.copy(this.camera.position).sub(this.target);
		this.#spherical.radius = this.#offset.length();
		this.#update();
	}
	/**
	* Move the {@link camera} forward or backward.
	* @param value - new value to use for zoom.
	* @private
	*/
	#zoom(value) {
		this.#spherical.radius = Math.min(this.maxZoom, Math.max(this.minZoom + 1e-6, this.#spherical.radius + value * this.zoomSpeed / 100));
		this.#update();
	}
	/**
	* Destroy the {@link OrbitControls}.
	*/
	destroy() {
		this.element = null;
	}
};
//#endregion
export { OrbitControls };
