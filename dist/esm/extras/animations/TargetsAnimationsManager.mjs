import { generateUUID } from '../../utils/utils.mjs';
import { isRenderer } from '../../core/renderers/utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _startTime, _currentTime, _deltaTime, _count, _maxCount, _TargetsAnimationsManager_instances, setSiblings_fn;
class TargetsAnimationsManager {
  /**
   * TargetsAnimationsManager constructor
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link TargetsAnimationsManager}.
   * @param parameters - {@link TargetsAnimationsManagerParams | parameters} used to create this {@link TargetsAnimationsManager}.
   */
  constructor(renderer, { label = "", targets = [] } = {}) {
    __privateAdd(this, _TargetsAnimationsManager_instances);
    // inner time values
    /** @ignore */
    __privateAdd(this, _startTime);
    /** @ignore */
    __privateAdd(this, _currentTime);
    /** @ignore */
    __privateAdd(this, _deltaTime);
    /** @ignore */
    __privateAdd(this, _count);
    /** @ignore */
    __privateAdd(this, _maxCount);
    this.uuid = generateUUID();
    this.inputIndices = [];
    this.setRenderer(renderer);
    this.label = label;
    this.targets = [];
    this.duration = 0;
    this.timeScale = 1;
    __privateSet(this, _startTime, performance.now());
    __privateSet(this, _currentTime, performance.now());
    __privateSet(this, _deltaTime, 0);
    __privateSet(this, _count, 0);
    __privateSet(this, _count, 0);
    __privateSet(this, _maxCount, Infinity);
    this.isPlaying = false;
    this.siblings = /* @__PURE__ */ new Map();
    if (targets && targets.length) {
      this.targets = [...this.targets, ...targets];
    }
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
      if (this.inputIndices.length) {
        __privateMethod(this, _TargetsAnimationsManager_instances, setSiblings_fn).call(this);
      }
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
    if (!target) {
      target = this.addTarget(object);
    }
    target.animations.push(animation);
    if (animation.inputIndex !== null && !this.inputIndices.includes(animation.inputIndex)) {
      this.inputIndices.push(animation.inputIndex);
    }
    __privateMethod(this, _TargetsAnimationsManager_instances, setSiblings_fn).call(this);
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
    if (target) {
      return target.animations.find((animation) => animation.path === path);
    } else {
      return null;
    }
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
    __privateSet(this, _maxCount, 1);
    this.play();
  }
  /**
   * Pause the {@link TargetsAnimationsManager}.
   */
  pause() {
    this.isPlaying = false;
    __privateSet(this, _startTime, -1);
  }
  /**
   * Stop the {@link TargetsAnimationsManager} and reset all the animations values to last keyframe.
   */
  stop() {
    this.isPlaying = false;
    __privateSet(this, _count, 0);
    if (!this.siblings.size) {
      __privateSet(this, _startTime, 0);
    }
    this.targets.forEach(
      (target) => target.animations.forEach(
        (animation) => animation.update(target.object, Math.min(animation.duration, this.duration))
      )
    );
    this.renderer.onAfterRenderScene.add(
      () => {
        this.targets.forEach((target) => {
          target.animations.forEach((animation) => {
            if (animation.onAfterUpdate) animation.onAfterUpdate();
          });
        });
      },
      {
        once: true
      }
    );
  }
  /**
   * {@link stop | Stop} the {@link TargetsAnimationsManager} at the end of the next animation loop.
   */
  stopAtEndOfLoop() {
    __privateSet(this, _maxCount, __privateGet(this, _count) + 1);
  }
  /**
   * Update all the {@link targets} animations.
   */
  update() {
    if (!this.isPlaying) return;
    if (__privateGet(this, _startTime) === -1) {
      __privateSet(this, _startTime, performance.now() - __privateGet(this, _deltaTime));
    } else if (__privateGet(this, _startTime) === 0) {
      __privateSet(this, _startTime, performance.now());
    }
    __privateSet(this, _currentTime, performance.now());
    __privateSet(this, _deltaTime, __privateGet(this, _currentTime) - __privateGet(this, _startTime));
    const time = __privateGet(this, _deltaTime) * this.timeScale / 1e3;
    const currentTime = time % this.duration;
    __privateSet(this, _count, Math.floor(time / this.duration));
    if (__privateGet(this, _count) >= __privateGet(this, _maxCount)) {
      this.stop();
      return;
    }
    this.targets.forEach(
      (target) => target.animations.forEach((animation) => animation.update(target.object, currentTime))
    );
  }
  /**
   * Call all the {@link targets} animations {@link KeyframesAnimation#onAfterUpdate | onAfterUpdate} callbacks.
   */
  onAfterUpdate() {
    if (!this.isPlaying) return;
    this.targets.forEach(
      (target) => target.animations.forEach((animation) => {
        if (animation.onAfterUpdate) animation.onAfterUpdate();
      })
    );
  }
}
_startTime = new WeakMap();
_currentTime = new WeakMap();
_deltaTime = new WeakMap();
_count = new WeakMap();
_maxCount = new WeakMap();
_TargetsAnimationsManager_instances = new WeakSet();
/**
 * Set the {@link TargetsAnimationsManager} siblings by comparing {@link inputIndices} arrays.
 * @private
 */
setSiblings_fn = function() {
  this.siblings = /* @__PURE__ */ new Map();
  this.renderer.animations.forEach((animation) => {
    if (animation.uuid !== this.uuid && JSON.stringify(animation.inputIndices) === JSON.stringify(this.inputIndices)) {
      this.siblings.set(animation.uuid, animation);
      animation.siblings.set(this.uuid, this);
    } else {
      animation.siblings.delete(this.uuid);
    }
  });
};

export { TargetsAnimationsManager };
