import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { throwWarning } from '../../utils/utils.mjs';

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
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _element, _offset, _isOrbiting, _spherical, _rotateStart, _isPaning, _panStart, _panDelta, _setBaseParams, setBaseParams_fn, _addEvents, addEvents_fn, _removeEvents, removeEvents_fn, _onMouseDown, onMouseDown_fn, _onTouchStart, onTouchStart_fn, _onMouseMove, onMouseMove_fn, _onTouchMove, onTouchMove_fn, _onMouseUp, onMouseUp_fn, _onTouchEnd, onTouchEnd_fn, _onMouseWheel, onMouseWheel_fn, _onContextMenu, onContextMenu_fn, _update, update_fn, _rotate, rotate_fn, _pan, pan_fn, _zoom, zoom_fn;
const tempVec2a = new Vec2();
const tempVec2b = new Vec2();
const tempVec3 = new Vec3();
class OrbitControls {
  /**
     * OrbitControls constructor
  =   * @param parameters - parameters to use.
     */
  constructor({
    camera,
    element = null,
    target = new Vec3(),
    // zoom
    enableZoom = true,
    minZoom = 0,
    maxZoom = Infinity,
    zoomSpeed = 1,
    // rotate
    enableRotate = true,
    minPolarAngle = 0,
    maxPolarAngle = Math.PI,
    minAzimuthAngle = -Infinity,
    maxAzimuthAngle = Infinity,
    rotateSpeed = 1,
    // pan
    enablePan = true,
    panSpeed = 1
  }) {
    /**
     * Set / reset base params
     * @ignore
     */
    __privateAdd(this, _setBaseParams);
    /**
     * Add the event listeners.
     * @private
     */
    __privateAdd(this, _addEvents);
    /**
     * Remove the event listeners.
     * @private
     */
    __privateAdd(this, _removeEvents);
    /**
     * Callback executed on mouse down event.
     * @param e - {@link MouseEvent}.
     * @private
     */
    __privateAdd(this, _onMouseDown);
    /**
     * Callback executed on touch start event.
     * @param e - {@link TouchEvent}.
     * @private
     */
    __privateAdd(this, _onTouchStart);
    /**
     * Callback executed on mouse move event.
     * @param e - {@link MouseEvent}.
     */
    __privateAdd(this, _onMouseMove);
    /**
     * Callback executed on touch move event.
     * @param e - {@link TouchEvent}.
     * @private
     */
    __privateAdd(this, _onTouchMove);
    /**
     * Callback executed on mouse up event.
     * @param e - {@link MouseEvent}.
     * @private
     */
    __privateAdd(this, _onMouseUp);
    /**
     * Callback executed on touch end event.
     * @param e - {@link MouseEvent}.
     * @private
     */
    __privateAdd(this, _onTouchEnd);
    /**
     * Callback executed on wheel event.
     * @param e - {@link WheelEvent}.
     * @private
     */
    __privateAdd(this, _onMouseWheel);
    /**
     * Prevent context menu apparition on right click
     * @param e - {@link MouseEvent}.
     * @private
     */
    __privateAdd(this, _onContextMenu);
    /**
     * Update the {@link camera} position based on the {@link target} and internal values.
     * @private
     */
    __privateAdd(this, _update);
    /**
     * Update the {@link camera} position based on input coordinates so it rotates around the {@link target}.
     * @param x - input coordinate along the X axis.
     * @param y - input coordinate along the Y axis.
     * @private
     */
    __privateAdd(this, _rotate);
    /**
     * Pan the {@link camera} position based on input coordinates by updating {@link target}.
     * @param x - input coordinate along the X axis.
     * @param y - input coordinate along the Y axis.
     * @private
     */
    __privateAdd(this, _pan);
    /**
     * Move the {@link camera} forward or backward.
     * @param value - new value to use for zoom.
     * @private
     */
    __privateAdd(this, _zoom);
    /**
     * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
     * @private
     */
    __privateAdd(this, _element, null);
    /** @ignore */
    __privateAdd(this, _offset, new Vec3());
    /** @ignore */
    __privateAdd(this, _isOrbiting, false);
    /** @ignore */
    __privateAdd(this, _spherical, { radius: 1, phi: 0, theta: 0 });
    /** @ignore */
    __privateAdd(this, _rotateStart, new Vec2());
    /** @ignore */
    __privateAdd(this, _isPaning, false);
    /** @ignore */
    __privateAdd(this, _panStart, new Vec2());
    /** @ignore */
    __privateAdd(this, _panDelta, new Vec3());
    if (!camera) {
      throwWarning("OrbitControls: cannot initialize without a camera.");
      return;
    }
    __privateMethod(this, _setBaseParams, setBaseParams_fn).call(this, {
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
    this.element = element ?? (typeof window !== "undefined" ? window : null);
    this.useCamera(camera);
  }
  /**
   * Allow to set or reset this {@link OrbitControls#camera | OrbitControls camera}.
   * @param camera - New {@link camera} to use.
   */
  useCamera(camera) {
    this.camera = camera;
    this.camera.position.onChange(() => {
      this.camera.lookAt(this.target);
    });
    __privateGet(this, _offset).copy(this.camera.position).sub(this.target);
    __privateGet(this, _spherical).radius = __privateGet(this, _offset).length();
    __privateGet(this, _spherical).theta = Math.atan2(__privateGet(this, _offset).x, __privateGet(this, _offset).z);
    __privateGet(this, _spherical).phi = Math.acos(Math.min(Math.max(__privateGet(this, _offset).y / __privateGet(this, _spherical).radius, -1), 1));
    __privateMethod(this, _update, update_fn).call(this);
  }
  /**
   * Reset the {@link OrbitControls} values.
   * @param parameters - Parameters used to reset the values. Those are the same as {@link OrbitControlsBaseParams} with an additional position parameter to allow to override the {@link OrbitControls} position.
   */
  reset({
    position,
    target,
    // zoom
    enableZoom = this.enableZoom,
    minZoom = this.minZoom,
    maxZoom = this.maxZoom,
    zoomSpeed = this.zoomSpeed,
    // rotate
    enableRotate = this.enableRotate,
    minPolarAngle = this.minPolarAngle,
    maxPolarAngle = this.maxPolarAngle,
    minAzimuthAngle = this.minAzimuthAngle,
    maxAzimuthAngle = this.maxAzimuthAngle,
    rotateSpeed = this.rotateSpeed,
    // pan
    enablePan = this.enablePan,
    panSpeed = this.panSpeed
  } = {}) {
    __privateMethod(this, _setBaseParams, setBaseParams_fn).call(this, {
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
    if (position) {
      this.updatePosition(position);
    }
  }
  /**
   * Allow to override the {@link camera} position.
   * @param position - new {@link camera} position to set.
   */
  updatePosition(position = new Vec3()) {
    position.sub(this.target);
    __privateGet(this, _spherical).radius = position.length();
    __privateGet(this, _spherical).theta = Math.atan2(position.x, position.z);
    __privateGet(this, _spherical).phi = Math.acos(Math.min(Math.max(position.y / __privateGet(this, _spherical).radius, -1), 1));
    __privateMethod(this, _update, update_fn).call(this);
  }
  /**
   * Set the element to use for event listeners. Can remove previous event listeners first if needed.
   * @param value - {@link HTMLElement} (or {@link Window} element) to use.
   */
  set element(value) {
    if (__privateGet(this, _element) && (!value || __privateGet(this, _element) !== value)) {
      __privateMethod(this, _removeEvents, removeEvents_fn).call(this);
    }
    __privateSet(this, _element, value);
    if (value) {
      __privateMethod(this, _addEvents, addEvents_fn).call(this);
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
   * Destroy the {@link OrbitControls}.
   */
  destroy() {
    this.element = null;
  }
}
_element = new WeakMap();
_offset = new WeakMap();
_isOrbiting = new WeakMap();
_spherical = new WeakMap();
_rotateStart = new WeakMap();
_isPaning = new WeakMap();
_panStart = new WeakMap();
_panDelta = new WeakMap();
_setBaseParams = new WeakSet();
setBaseParams_fn = function({
  target,
  // zoom
  enableZoom = this.enableZoom,
  minZoom = this.minZoom,
  maxZoom = this.maxZoom,
  zoomSpeed = this.zoomSpeed,
  // rotate
  enableRotate = this.enableRotate,
  minPolarAngle = this.minPolarAngle,
  maxPolarAngle = this.maxPolarAngle,
  minAzimuthAngle = this.minAzimuthAngle,
  maxAzimuthAngle = this.maxAzimuthAngle,
  rotateSpeed = this.rotateSpeed,
  // pan
  enablePan = this.enablePan,
  panSpeed = this.panSpeed
} = {}) {
  if (target) {
    this.target = target;
  }
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
};
_addEvents = new WeakSet();
addEvents_fn = function() {
  __privateGet(this, _element).addEventListener("contextmenu", __privateMethod(this, _onContextMenu, onContextMenu_fn).bind(this), false);
  __privateGet(this, _element).addEventListener("mousedown", __privateMethod(this, _onMouseDown, onMouseDown_fn).bind(this), false);
  __privateGet(this, _element).addEventListener("mousemove", __privateMethod(this, _onMouseMove, onMouseMove_fn).bind(this), false);
  __privateGet(this, _element).addEventListener("mouseup", __privateMethod(this, _onMouseUp, onMouseUp_fn).bind(this), false);
  __privateGet(this, _element).addEventListener("touchstart", __privateMethod(this, _onTouchStart, onTouchStart_fn).bind(this), { passive: false });
  __privateGet(this, _element).addEventListener("touchmove", __privateMethod(this, _onTouchMove, onTouchMove_fn).bind(this), { passive: false });
  __privateGet(this, _element).addEventListener("touchend", __privateMethod(this, _onTouchEnd, onTouchEnd_fn).bind(this), false);
  __privateGet(this, _element).addEventListener("wheel", __privateMethod(this, _onMouseWheel, onMouseWheel_fn).bind(this), { passive: false });
};
_removeEvents = new WeakSet();
removeEvents_fn = function() {
  __privateGet(this, _element).removeEventListener("contextmenu", __privateMethod(this, _onContextMenu, onContextMenu_fn).bind(this), false);
  __privateGet(this, _element).removeEventListener("mousedown", __privateMethod(this, _onMouseDown, onMouseDown_fn).bind(this), false);
  __privateGet(this, _element).removeEventListener("mousemove", __privateMethod(this, _onMouseMove, onMouseMove_fn).bind(this), false);
  __privateGet(this, _element).removeEventListener("mouseup", __privateMethod(this, _onMouseUp, onMouseUp_fn).bind(this), false);
  __privateGet(this, _element).removeEventListener("touchstart", __privateMethod(this, _onTouchStart, onTouchStart_fn).bind(this), { passive: false });
  __privateGet(this, _element).removeEventListener("touchmove", __privateMethod(this, _onTouchMove, onTouchMove_fn).bind(this), { passive: false });
  __privateGet(this, _element).removeEventListener("touchend", __privateMethod(this, _onTouchEnd, onTouchEnd_fn).bind(this), false);
  __privateGet(this, _element).removeEventListener("wheel", __privateMethod(this, _onMouseWheel, onMouseWheel_fn).bind(this), { passive: false });
};
_onMouseDown = new WeakSet();
onMouseDown_fn = function(e) {
  if (e.button === 0 && this.enableRotate) {
    __privateSet(this, _isOrbiting, true);
    __privateGet(this, _rotateStart).set(e.clientX, e.clientY);
  } else if (e.button === 2 && this.enablePan) {
    __privateSet(this, _isPaning, true);
    __privateGet(this, _panStart).set(e.clientX, e.clientY);
  }
  e.stopPropagation();
  e.preventDefault();
};
_onTouchStart = new WeakSet();
onTouchStart_fn = function(e) {
  if (e.touches.length === 1 && this.enableRotate) {
    __privateSet(this, _isOrbiting, true);
    __privateGet(this, _rotateStart).set(e.touches[0].pageX, e.touches[0].pageY);
  }
};
_onMouseMove = new WeakSet();
onMouseMove_fn = function(e) {
  if (__privateGet(this, _isOrbiting) && this.enableRotate) {
    __privateMethod(this, _rotate, rotate_fn).call(this, e.clientX, e.clientY);
  } else if (__privateGet(this, _isPaning) && this.enablePan) {
    __privateMethod(this, _pan, pan_fn).call(this, e.clientX, e.clientY);
  }
};
_onTouchMove = new WeakSet();
onTouchMove_fn = function(e) {
  if (__privateGet(this, _isOrbiting) && this.enableRotate) {
    __privateMethod(this, _rotate, rotate_fn).call(this, e.touches[0].pageX, e.touches[0].pageY);
  }
};
_onMouseUp = new WeakSet();
onMouseUp_fn = function(e) {
  __privateSet(this, _isOrbiting, false);
  __privateSet(this, _isPaning, false);
};
_onTouchEnd = new WeakSet();
onTouchEnd_fn = function(e) {
  __privateSet(this, _isOrbiting, false);
  __privateSet(this, _isPaning, false);
};
_onMouseWheel = new WeakSet();
onMouseWheel_fn = function(e) {
  if (this.enableZoom) {
    __privateMethod(this, _zoom, zoom_fn).call(this, e.deltaY);
    e.preventDefault();
  }
};
_onContextMenu = new WeakSet();
onContextMenu_fn = function(e) {
  e.preventDefault();
};
_update = new WeakSet();
update_fn = function() {
  const sinPhiRadius = __privateGet(this, _spherical).radius * Math.sin(Math.max(1e-6, __privateGet(this, _spherical).phi));
  __privateGet(this, _offset).x = sinPhiRadius * Math.sin(__privateGet(this, _spherical).theta);
  __privateGet(this, _offset).y = __privateGet(this, _spherical).radius * Math.cos(__privateGet(this, _spherical).phi);
  __privateGet(this, _offset).z = sinPhiRadius * Math.cos(__privateGet(this, _spherical).theta);
  this.camera.position.copy(this.target).add(__privateGet(this, _offset));
};
_rotate = new WeakSet();
rotate_fn = function(x, y) {
  tempVec2a.set(x, y);
  tempVec2b.copy(tempVec2a).sub(__privateGet(this, _rotateStart)).multiplyScalar(this.rotateSpeed);
  __privateGet(this, _spherical).theta -= 2 * Math.PI * tempVec2b.x / this.camera.size.height;
  __privateGet(this, _spherical).phi -= 2 * Math.PI * tempVec2b.y / this.camera.size.height;
  __privateGet(this, _spherical).theta = Math.min(this.maxAzimuthAngle, Math.max(this.minAzimuthAngle, __privateGet(this, _spherical).theta));
  __privateGet(this, _spherical).phi = Math.min(this.maxPolarAngle, Math.max(this.minPolarAngle, __privateGet(this, _spherical).phi));
  __privateGet(this, _rotateStart).copy(tempVec2a);
  __privateMethod(this, _update, update_fn).call(this);
};
_pan = new WeakSet();
pan_fn = function(x, y) {
  tempVec2a.set(x, y);
  tempVec2b.copy(tempVec2a).sub(__privateGet(this, _panStart)).multiplyScalar(this.panSpeed);
  __privateGet(this, _panDelta).set(0);
  tempVec3.copy(this.camera.position).sub(this.target);
  let targetDistance = tempVec3.length();
  targetDistance *= Math.tan(this.camera.fov / 2 * Math.PI / 180);
  tempVec3.set(
    this.camera.modelMatrix.elements[0],
    this.camera.modelMatrix.elements[1],
    this.camera.modelMatrix.elements[2]
  );
  tempVec3.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / this.camera.size.height);
  __privateGet(this, _panDelta).add(tempVec3);
  tempVec3.set(
    this.camera.modelMatrix.elements[4],
    this.camera.modelMatrix.elements[5],
    this.camera.modelMatrix.elements[6]
  );
  tempVec3.multiplyScalar(2 * tempVec2b.y * targetDistance / this.camera.size.height);
  __privateGet(this, _panDelta).add(tempVec3);
  __privateGet(this, _panStart).copy(tempVec2a);
  this.target.add(__privateGet(this, _panDelta));
  __privateGet(this, _offset).copy(this.camera.position).sub(this.target);
  __privateGet(this, _spherical).radius = __privateGet(this, _offset).length();
  __privateMethod(this, _update, update_fn).call(this);
};
_zoom = new WeakSet();
zoom_fn = function(value) {
  __privateGet(this, _spherical).radius = Math.min(
    this.maxZoom,
    Math.max(this.minZoom + 1e-6, __privateGet(this, _spherical).radius + value * this.zoomSpeed / 100)
  );
  __privateMethod(this, _update, update_fn).call(this);
};

export { OrbitControls };
