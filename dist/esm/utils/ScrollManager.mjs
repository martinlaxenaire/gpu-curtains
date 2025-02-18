var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __setScroll;
class ScrollManager {
  /**
   * ScrollManager constructor
   * @param parameters - {@link ScrollManagerParams | parameters} used to create this {@link ScrollManager}
   */
  constructor({
    scroll = { x: 0, y: 0 },
    delta = { x: 0, y: 0 },
    shouldWatch = true,
    onScroll = (delta2 = { x: 0, y: 0 }) => {
    }
  } = {}) {
    /** @ignore */
    __privateAdd(this, __setScroll);
    this.scroll = scroll;
    this.delta = delta;
    this.shouldWatch = shouldWatch;
    this.onScroll = onScroll;
    __privateSet(this, __setScroll, this.setScroll.bind(this));
    if (this.shouldWatch) {
      window.addEventListener("scroll", __privateGet(this, __setScroll), { passive: true });
    }
  }
  /**
   * Called by the scroll event listener
   */
  setScroll() {
    this.updateScrollValues({ x: window.pageXOffset, y: window.pageYOffset });
  }
  /**
   * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
   * Internally called by the scroll event listener
   * Could be called externally as well if the user wants to handle the scroll by himself
   * @param parameters - {@link core/DOM/DOMElement.DOMPosition | scroll values}
   */
  updateScrollValues({ x, y }) {
    const lastScroll = this.scroll;
    this.scroll = { x, y };
    this.delta = {
      x: lastScroll.x - this.scroll.x,
      y: lastScroll.y - this.scroll.y
    };
    if (this.onScroll) {
      this.onScroll(this.delta);
    }
  }
  /**
   * Destroy our scroll manager (just remove our event listner if it had been added previously)
   */
  destroy() {
    if (this.shouldWatch) {
      window.removeEventListener("scroll", __privateGet(this, __setScroll), { passive: true });
    }
  }
}
__setScroll = new WeakMap();

export { ScrollManager };
