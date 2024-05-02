import { Object3D } from '../../core/objects3D/Object3D.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _lastPosition, _isOrbiting, _element;
class OrbitControls extends Object3D {
  /**
   * OrbitControls constructor
   * @param renderer - {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well.
   * @param camera - optional {@link Camera} to use.
   */
  constructor(renderer, camera = null) {
    super();
    /**
     * Last pointer {@link Vec2 | position}, used internally for orbiting delta calculations.
     * @private
     */
    __privateAdd(this, _lastPosition, new Vec2());
    /**
     * Whether the {@link OrbitControls} are currently orbiting.
     * @private
     */
    __privateAdd(this, _isOrbiting, false);
    /** Whether to constrain the orbit controls along X axis or not. */
    this.constrainXOrbit = true;
    /** Whether to constrain the orbit controls along Y axis or not. */
    this.constrainYOrbit = false;
    /** Minimum orbit values to apply along both axis if constrained. */
    this.minOrbit = new Vec2(-Math.PI * 0.5, -Math.PI);
    /** Maximum orbit values to apply along both axis if constrained. */
    this.maxOrbit = new Vec2(Math.PI * 0.5, Math.PI);
    /** Orbit step (speed) values to use. */
    this.orbitStep = new Vec2(0.025);
    /** Whether to constrain the zoom or not. */
    this.constrainZoom = true;
    /** Minimum zoom value to apply if constrained (can be negative). */
    this.minZoom = 0;
    /** Maximum zoom value to apply if constrained. */
    this.maxZoom = 20;
    /** Zoom step (speed) value to use. */
    this.zoomStep = 5e-3;
    /** {@link OrbitControls} target. */
    this.target = new Vec3();
    /**
     * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
     * @private
     */
    __privateAdd(this, _element, null);
    this.renderer = renderer;
    this.parent = this.renderer.scene;
    this.quaternion.setAxisOrder("YXZ");
    this.camera = camera || this.renderer.camera;
    this.camera.parent = this;
    this.element = this.renderer.domElement.element;
  }
  /**
   * Set the element to use for event listeners. Can remove previous event listeners first if needed.
   * @param value - {@link HTMLElement} (or {@link Window} element) to use.
   */
  set element(value) {
    if (__privateGet(this, _element) && (!value || __privateGet(this, _element) !== value)) {
      this.removeEvents();
    }
    __privateSet(this, _element, value);
    if (value) {
      this.addEvents();
    }
  }
  /**
   * Get our element to use for event listeners.
   * @returns - {@link HTMLElement} (or {@link Window} element) used.
   */
  get element() {
    return __privateGet(this, _element);
  }
  /**
   * Add the event listeners.
   */
  addEvents() {
    __privateGet(this, _element).addEventListener("pointerdown", this.onPointerDown.bind(this));
    __privateGet(this, _element).addEventListener("pointermove", this.onPointerMove.bind(this));
    __privateGet(this, _element).addEventListener("pointerup", this.onPointerUp.bind(this));
    __privateGet(this, _element).addEventListener("wheel", this.onMouseWheel.bind(this));
  }
  /**
   * Remove the event listeners.
   */
  removeEvents() {
    __privateGet(this, _element).removeEventListener("pointerdown", this.onPointerDown.bind(this));
    __privateGet(this, _element).removeEventListener("pointermove", this.onPointerMove.bind(this));
    __privateGet(this, _element).removeEventListener("pointerup", this.onPointerUp.bind(this));
    __privateGet(this, _element).removeEventListener("wheel", this.onMouseWheel.bind(this));
  }
  /**
   * Callback executed on pointer down event.
   * @param e - {@link PointerEvent}.
   */
  onPointerDown(e) {
    if (e.isPrimary) {
      __privateSet(this, _isOrbiting, true);
    }
    __privateGet(this, _lastPosition).set(e.pageX, e.pageY);
  }
  /**
   * Callback executed on pointer move event.
   * @param e - {@link PointerEvent}.
   */
  onPointerMove(e) {
    let xDelta, yDelta;
    if (document.pointerLockElement) {
      xDelta = e.movementX;
      yDelta = e.movementY;
      this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y);
    } else if (__privateGet(this, _isOrbiting)) {
      xDelta = e.pageX - __privateGet(this, _lastPosition).x;
      yDelta = e.pageY - __privateGet(this, _lastPosition).y;
      __privateGet(this, _lastPosition).set(e.pageX, e.pageY);
      this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y);
    }
  }
  /**
   * Callback executed on pointer up event.
   * @param e - {@link PointerEvent}.
   */
  onPointerUp(e) {
    if (e.isPrimary) {
      __privateSet(this, _isOrbiting, false);
    }
  }
  /**
   * Callback executed on wheel event.
   * @param e - {@link WheelEvent}.
   */
  onMouseWheel(e) {
    this.zoom(this.position.z + e.deltaY * this.zoomStep);
    e.preventDefault();
  }
  /**
   * Reset the {@link OrbitControls} {@link position} and {@link rotation} values.
   */
  reset() {
    this.position.set(0);
    this.rotation.set(0);
  }
  /**
   * Update the {@link OrbitControls} {@link rotation} based on deltas.
   * @param xDelta - delta along the X axis.
   * @param yDelta - delta along the Y axis.
   */
  orbit(xDelta, yDelta) {
    if (xDelta || yDelta) {
      this.rotation.y -= xDelta;
      if (this.constrainYOrbit) {
        this.rotation.y = Math.min(Math.max(this.rotation.y, this.minOrbit.y), this.maxOrbit.y);
      } else {
        while (this.rotation.y < -Math.PI) {
          this.rotation.y += Math.PI * 2;
        }
        while (this.rotation.y >= Math.PI) {
          this.rotation.y -= Math.PI * 2;
        }
      }
      this.rotation.x -= yDelta;
      if (this.constrainXOrbit) {
        this.rotation.x = Math.min(Math.max(this.rotation.x, this.minOrbit.x), this.maxOrbit.x);
      } else {
        while (this.rotation.x < -Math.PI) {
          this.rotation.x += Math.PI * 2;
        }
        while (this.rotation.x >= Math.PI) {
          this.rotation.x -= Math.PI * 2;
        }
      }
    }
  }
  /**
   * Update the {@link OrbitControls} {@link position} Z component based on the new distance.
   * @param distance - new distance to use.
   */
  zoom(distance) {
    this.position.z = distance;
    if (this.constrainZoom) {
      this.position.z = Math.min(Math.max(this.position.z, this.minZoom), this.maxZoom);
    }
  }
  /**
   * Override {@link Object3D#updateModelMatrix | updateModelMatrix} method to compose the {@link modelMatrix}.
   */
  updateModelMatrix() {
    this.modelMatrix.identity().translate(this.target).rotateFromQuaternion(this.quaternion).translate(this.position);
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Destroy the {@link OrbitControls}.
   */
  destroy() {
    this.camera.parent = this.renderer.scene;
    this.parent = null;
    this.element = null;
  }
}
_lastPosition = new WeakMap();
_isOrbiting = new WeakMap();
_element = new WeakMap();

export { OrbitControls };
