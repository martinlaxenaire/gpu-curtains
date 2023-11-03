import { Box3 } from '../../math/Box3'
import { Mat4 } from '../../math/Mat4'
import { DOMElementBoundingRect, RectCoords } from './DOMElement'

/**
 * An object defining all possible {@link DOMFrustum} class instancing parameters
 */
export interface DOMFrustumParams {
  /** our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@link Geometry} */
  boundingBox?: Box3
  /** [model view projection matrix]{@link ProjectedObject3D#modelViewProjectionMatrix} to use for frustum calculations */
  modelViewProjectionMatrix?: Mat4
  /** the [bounding rectangle]{@link DOMElementBoundingRect} to check against */
  containerBoundingRect?: DOMElementBoundingRect
  /** additional margins to add to [containerBoundingRect]{@link DOMFrustumParams#containerBoundingRect} */
  DOMFrustumMargins?: RectCoords
  /** callback to run when the [projectedBoundingRect]{@link DOMFrustumParams#projectedBoundingRect} reenters the view frustum */
  onReEnterView?: () => void
  /** callback to run when the [projectedBoundingRect]{@link DOMFrustumParams#projectedBoundingRect} leaves the view frustum */
  onLeaveView?: () => void
}

/** @constant {RectCoords} - default [DOMFrustumMargins]{@link DOMFrustum#DOMFrustumMargins} */
const defaultDOMFrustumMargins: RectCoords = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

/**
 * DOMFrustum class:
 * Used to check if a {@link ProjectedObject3D} is currently contained inside a DOM bounding rectangle.
 * Uses a modelViewProjectionMatrix that contains both 3D Object and Camera useful transformation and projection informations.
 * The DOM bounding rectangle to check against usually is the {@link GPURenderer}'s {@link DOMElement} bounding rectangle, unless frustum margins are specified.
 */
export class DOMFrustum {
  /** Our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@link Geometry} */
  boundingBox: Box3
  /** A model view projection matrix defining transformations, usually from a {@link ProjectedObject3D}, to use for frustum calculations */
  modelViewProjectionMatrix: Mat4

  /** The DOM bounding rectangle to check against, usually the renderer DOM Element bounding rectangle */
  containerBoundingRect: DOMElementBoundingRect
  /** Additional margins to add to {@link containerBoundingRect} */
  DOMFrustumMargins: RectCoords
  /** A DOM Element bounding rectangle representing the result of our {@link boundingBox} with the {@link modelViewProjectionMatrix} applied */
  projectedBoundingRect: DOMElementBoundingRect

  /** Callback to run when the {@link projectedBoundingRect} reenters the view frustum */
  onReEnterView: () => void
  /** Callback to run when the {@link projectedBoundingRect} leaves the view frustum */
  onLeaveView: () => void

  /** Flag to indicate whether the given {@link projectedBoundingRect} is intersecting our view frustum */
  isIntersecting: boolean
  /** Flag to indicate whether we should update our {@link projectedBoundingRect} */
  shouldUpdate: boolean

  /**
   * DOMFrustum constructor
   * @param {DOMFrustumParams} parameters - [parameters]{@link DOMFrustumParams} used to create our {@link DOMFrustum}
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
   * Set our {@link containerBoundingRect} (called on resize)
   * @param boundingRect - new bounding rectangle
   */
  setContainerBoundingRect(boundingRect: DOMElementBoundingRect) {
    this.containerBoundingRect = boundingRect
  }

  /**
   * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
   * @readonly
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
   * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox} and then check against intersections
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
   * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}
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
