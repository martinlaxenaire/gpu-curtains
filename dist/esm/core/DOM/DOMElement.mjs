import { resizeManager } from '../../utils/ResizeManager.mjs';
import { throwError } from '../../utils/utils.mjs';

class DOMElement {
  /**
   * DOMElement constructor
   * @param parameters - {@link DOMElementParams | parameters} used to create our DOMElement
   */
  constructor({
    element = document.body,
    priority = 1,
    onSizeChanged = (boundingRect = null) => {
    },
    onPositionChanged = (boundingRect = null) => {
    }
  } = {}) {
    if (typeof element === "string") {
      this.element = document.querySelector(element);
      if (!this.element) {
        const notFoundEl = typeof element === "string" ? `'${element}' selector` : `${element} HTMLElement`;
        throwError(`DOMElement: corresponding ${notFoundEl} not found.`);
      }
    } else {
      this.element = element;
    }
    this.priority = priority;
    this.isResizing = false;
    this.onSizeChanged = onSizeChanged;
    this.onPositionChanged = onPositionChanged;
    this.resizeManager = resizeManager;
    this.resizeManager.observe({
      element: this.element,
      priority: this.priority,
      callback: () => {
        this.setSize();
      }
    });
    this.setSize();
  }
  /**
   * Check whether 2 bounding rectangles are equals
   * @param rect1 - first bounding rectangle
   * @param rect2 - second bounding rectangle
   * @returns - whether the rectangles are equals or not
   */
  compareBoundingRect(rect1, rect2) {
    return !["x", "y", "left", "top", "right", "bottom", "width", "height"].some((k) => rect1[k] !== rect2[k]);
  }
  /**
   * Get our element bounding rectangle
   */
  get boundingRect() {
    return this._boundingRect;
  }
  /**
   * Set our element bounding rectangle
   * @param boundingRect - new bounding rectangle
   */
  set boundingRect(boundingRect) {
    const isSameRect = !!this.boundingRect && this.compareBoundingRect(boundingRect, this.boundingRect);
    this._boundingRect = {
      top: boundingRect.top,
      right: boundingRect.right,
      bottom: boundingRect.bottom,
      left: boundingRect.left,
      width: boundingRect.width,
      height: boundingRect.height,
      x: boundingRect.x,
      y: boundingRect.y
    };
    if (!isSameRect) {
      this.onSizeChanged(this.boundingRect);
    }
  }
  /**
   * Update our element bounding rectangle because the scroll position has changed
   * @param delta - scroll delta values along X and Y axis
   */
  updateScrollPosition(delta = { x: 0, y: 0 }) {
    if (this.isResizing)
      return;
    this._boundingRect.top += delta.y;
    this._boundingRect.left += delta.x;
    if (delta.x || delta.y) {
      this.onPositionChanged(this.boundingRect);
    }
  }
  /**
   * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
   * @param boundingRect - new bounding rectangle
   */
  setSize(boundingRect = null) {
    if (!this.element || this.isResizing)
      return;
    this.isResizing = true;
    this.boundingRect = boundingRect ?? this.element.getBoundingClientRect();
    setTimeout(() => {
      this.isResizing = false;
    }, 10);
  }
  /**
   * Destroy our DOMElement - remove from resize observer and clear throttle timeout
   */
  destroy() {
    this.resizeManager.unobserve(this.element);
  }
}

export { DOMElement };
