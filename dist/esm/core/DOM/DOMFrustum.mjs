import { Box3 } from '../../math/Box3.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Vec3 } from '../../math/Vec3.mjs';

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
    this.clipSpaceOBB = new Box3();
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
   * Compute the oriented bounding box in clip space.
   */
  computeClipSpaceOBB() {
    this.clipSpaceOBB.set();
    this.boundingBox.applyMat4(this.modelViewProjectionMatrix, this.clipSpaceOBB);
  }
  /**
   * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox}, i.e. apply OBB to document coordinates and set {@link projectedBoundingRect}.
   */
  setDocumentCoordsFromClipSpaceOBB() {
    this.computeClipSpaceOBB();
    const minX = (this.clipSpaceOBB.min.x + 1) * 0.5;
    const maxX = (this.clipSpaceOBB.max.x + 1) * 0.5;
    const minY = 1 - (this.clipSpaceOBB.min.y + 1) * 0.5;
    const maxY = 1 - (this.clipSpaceOBB.max.y + 1) * 0.5;
    const { width, height, top, left } = this.containerBoundingRect;
    this.projectedBoundingRect = {
      left: minX * width + left,
      x: minX * width + left,
      top: maxY * height + top,
      y: maxY * height + top,
      right: maxX * width + left,
      bottom: minY * height + top,
      width: maxX * width + left - (minX * width + left),
      height: minY * height + top - (maxY * height + top)
    };
  }
  /**
   * Apply the bounding sphere in clip space to document coordinates and set {@link projectedBoundingRect}.
   * @param boundingSphere - bounding sphere in clip space.
   */
  setDocumentCoordsFromClipSpaceSphere(boundingSphere = { center: new Vec3(), radius: 0 }) {
    const centerX = (boundingSphere.center.x + 1) * 0.5;
    const centerY = 1 - (boundingSphere.center.y + 1) * 0.5;
    const { width, height, top, left } = this.containerBoundingRect;
    this.projectedBoundingRect.width = boundingSphere.radius * height * 0.5;
    this.projectedBoundingRect.height = boundingSphere.radius * height * 0.5;
    this.projectedBoundingRect.left = centerX * width + left - this.projectedBoundingRect.width * 0.5;
    this.projectedBoundingRect.x = centerX * width + left - this.projectedBoundingRect.width * 0.5;
    this.projectedBoundingRect.top = centerY * height + top - this.projectedBoundingRect.height * 0.5;
    this.projectedBoundingRect.y = centerY * height + top - this.projectedBoundingRect.height * 0.5;
    this.projectedBoundingRect.right = this.projectedBoundingRect.left + this.projectedBoundingRect.width;
    this.projectedBoundingRect.bottom = this.projectedBoundingRect.top + this.projectedBoundingRect.height;
  }
  /**
   * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}.
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
