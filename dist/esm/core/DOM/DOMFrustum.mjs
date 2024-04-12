import { Box3 } from '../../math/Box3.mjs';
import { Mat4 } from '../../math/Mat4.mjs';

const defaultDOMFrustumMargins = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};
class DOMFrustum {
  /**
   * DOMFrustum constructor
   * @param {DOMFrustumParams} parameters - {@link DOMFrustumParams | parameters} used to create our {@link DOMFrustum}
   */
  constructor({
    boundingBox = new Box3(),
    modelViewProjectionMatrix = new Mat4(),
    containerBoundingRect = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    },
    DOMFrustumMargins = defaultDOMFrustumMargins,
    onReEnterView = () => {
    },
    onLeaveView = () => {
    }
  }) {
    this.boundingBox = boundingBox;
    this.modelViewProjectionMatrix = modelViewProjectionMatrix;
    this.containerBoundingRect = containerBoundingRect;
    this.DOMFrustumMargins = { ...defaultDOMFrustumMargins, ...DOMFrustumMargins };
    this.projectedBoundingRect = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
    this.onReEnterView = onReEnterView;
    this.onLeaveView = onLeaveView;
    this.isIntersecting = false;
  }
  /**
   * Set our {@link containerBoundingRect} (called on resize)
   * @param boundingRect - new bounding rectangle
   */
  setContainerBoundingRect(boundingRect) {
    this.containerBoundingRect = boundingRect;
  }
  /**
   * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
   * @readonly
   */
  get DOMFrustumBoundingRect() {
    return {
      top: this.projectedBoundingRect.top - this.DOMFrustumMargins.top,
      right: this.projectedBoundingRect.right + this.DOMFrustumMargins.right,
      bottom: this.projectedBoundingRect.bottom + this.DOMFrustumMargins.bottom,
      left: this.projectedBoundingRect.left - this.DOMFrustumMargins.left
    };
  }
  /**
   * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox} and then check against intersections
   */
  computeProjectedToDocumentCoords() {
    const projectedBox = this.boundingBox.applyMat4(this.modelViewProjectionMatrix);
    projectedBox.min.x = (projectedBox.min.x + 1) * 0.5;
    projectedBox.max.x = (projectedBox.max.x + 1) * 0.5;
    projectedBox.min.y = 1 - (projectedBox.min.y + 1) * 0.5;
    projectedBox.max.y = 1 - (projectedBox.max.y + 1) * 0.5;
    const { width, height, top, left } = this.containerBoundingRect;
    this.projectedBoundingRect = {
      left: projectedBox.min.x * width + left,
      x: projectedBox.min.x * width + left,
      top: projectedBox.max.y * height + top,
      y: projectedBox.max.y * height + top,
      right: projectedBox.max.x * width + left,
      bottom: projectedBox.min.y * height + top,
      width: projectedBox.max.x * width + left - (projectedBox.min.x * width + left),
      height: projectedBox.min.y * height + top - (projectedBox.max.y * height + top)
    };
    this.intersectsContainer();
  }
  /**
   * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}
   */
  intersectsContainer() {
    if (Math.round(this.DOMFrustumBoundingRect.right) <= this.containerBoundingRect.left || Math.round(this.DOMFrustumBoundingRect.left) >= this.containerBoundingRect.left + this.containerBoundingRect.width || Math.round(this.DOMFrustumBoundingRect.bottom) <= this.containerBoundingRect.top || Math.round(this.DOMFrustumBoundingRect.top) >= this.containerBoundingRect.top + this.containerBoundingRect.height) {
      if (this.isIntersecting) {
        this.onLeaveView();
      }
      this.isIntersecting = false;
    } else {
      if (!this.isIntersecting) {
        this.onReEnterView();
      }
      this.isIntersecting = true;
    }
  }
}

export { DOMFrustum };
