import { Box3 } from '../../math/Box3'
import { Mat4 } from '../../math/Mat4'
import { DOMElementBoundingRect, RectCoords } from './DOMElement'

export interface DOMFrustumParams {
  boundingBox?: Box3
  modelViewProjectionMatrix?: Mat4
  containerBoundingRect?: DOMElementBoundingRect
  DOMFrustumMargins?: RectCoords
  onReEnterView?: () => void
  onLeaveView?: () => void
}

const defaultDOMFrustumMargins: RectCoords = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

/**
 * DOMFrustum class:
 * Used to check if a {@see Projected3DObject} is currently contained inside a DOM bounding rectangle.
 * Uses a modelViewProjectionMatrix that contains both 3D Object and Camera useful transformation and projection informations.
 * The DOM bounding rectangle to check against usually is the {@see GPURenderer}'s {@see DOMElement} bounding rectangle, unless frustum margins are specified.
 */
export class DOMFrustum {
  boundingBox: Box3
  modelViewProjectionMatrix: Mat4

  containerBoundingRect: DOMElementBoundingRect
  DOMFrustumMargins: RectCoords
  projectedBoundingRect: DOMElementBoundingRect

  onReEnterView: () => void
  onLeaveView: () => void

  isIntersecting: boolean
  shouldUpdate: boolean

  /**
   * DOMFrustum constructor
   * @param {DOMFrustumParams} parameters - parameters used to create our DOMFrustum
   * @param {Box3=} parameters.boundingBox - our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@see Geometry}
   * @param {Mat4=} parameters.modelViewProjectionMatrix - {@see Projected3DObject} model view projection matrix to use for frustum calculations
   * @param {DOMElementBoundingRect=} parameters.containerBoundingRect - the bounding rectangle to check against
   * @param {RectCoords=} parameters.DOMFrustumMargins - additional margins to add to containerBoundingRect
   * @param {function=} parameters.onReEnterView - callback to run when the {@see Projected3DObject} re enters the view frustum
   * @param {function=} parameters.onLeaveView - callback to run when the {@see Projected3DObject} leaves the view frustum
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
      y: 0,
    },
    DOMFrustumMargins = defaultDOMFrustumMargins,
    onReEnterView = () => {
      /* allow empty callbacks */
    },
    onLeaveView = () => {
      /* allow empty callbacks */
    },
  }: DOMFrustumParams) {
    this.boundingBox = boundingBox
    this.modelViewProjectionMatrix = modelViewProjectionMatrix
    this.containerBoundingRect = containerBoundingRect
    this.DOMFrustumMargins = { ...defaultDOMFrustumMargins, ...DOMFrustumMargins }

    this.projectedBoundingRect = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }

    this.onReEnterView = onReEnterView
    this.onLeaveView = onLeaveView

    this.isIntersecting = false
    this.shouldUpdate = false
  }

  /**
   * Set our container bounding rectangle (called on resize)
   * @param {DOMElementBoundingRect} boundingRect - new bounding rectangle
   */
  setContainerBoundingRect(boundingRect: DOMElementBoundingRect) {
    this.containerBoundingRect = boundingRect
  }

  /**
   * Get our DOM frustum bounding rectangle, i.e. our container bounding rectangle with the DOM frustum margins applied
   * @readonly
   * @type {RectCoords}
   */
  get DOMFrustumBoundingRect(): RectCoords {
    return {
      top: this.projectedBoundingRect.top - this.DOMFrustumMargins.top,
      right: this.projectedBoundingRect.right + this.DOMFrustumMargins.right,
      bottom: this.projectedBoundingRect.bottom + this.DOMFrustumMargins.bottom,
      left: this.projectedBoundingRect.left - this.DOMFrustumMargins.left,
    }
  }

  /**
   * Applies all model view projection matrix transformation to our bounding box and then check against intersections
   */
  computeProjectedToDocumentCoords() {
    const projectedBox = this.boundingBox.applyMat4(this.modelViewProjectionMatrix)

    // normalize [-1, 1] coords to [0, 1]
    projectedBox.min.x = (projectedBox.min.x + 1) * 0.5
    projectedBox.max.x = (projectedBox.max.x + 1) * 0.5

    projectedBox.min.y = 1 - (projectedBox.min.y + 1) * 0.5
    projectedBox.max.y = 1 - (projectedBox.max.y + 1) * 0.5

    const { width, height, top, left } = this.containerBoundingRect

    this.projectedBoundingRect = {
      left: projectedBox.min.x * width + left,
      x: projectedBox.min.x * width + left,
      top: projectedBox.max.y * height + top,
      y: projectedBox.max.y * height + top,
      right: projectedBox.max.x * width + left,
      bottom: projectedBox.min.y * height + top,
      width: projectedBox.max.x * width + left - (projectedBox.min.x * width + left),
      height: projectedBox.min.y * height + top - (projectedBox.max.y * height + top),
    }

    this.intersectsContainer()
  }

  /**
   * Check whether our projected bounding rectangle intersects with our DOM frustum bounding rectangle
   */
  intersectsContainer() {
    if (
      Math.round(this.DOMFrustumBoundingRect.right) <= this.containerBoundingRect.left ||
      Math.round(this.DOMFrustumBoundingRect.left) >=
        this.containerBoundingRect.left + this.containerBoundingRect.width ||
      Math.round(this.DOMFrustumBoundingRect.bottom) <= this.containerBoundingRect.top ||
      Math.round(this.DOMFrustumBoundingRect.top) >= this.containerBoundingRect.top + this.containerBoundingRect.height
    ) {
      if (this.isIntersecting) {
        this.onLeaveView()
      }

      this.isIntersecting = false
    } else {
      if (!this.isIntersecting) {
        this.onReEnterView()
      }

      this.isIntersecting = true
    }
  }
}
