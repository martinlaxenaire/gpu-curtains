import { Box3 } from '../../math/Box3';
import { Mat4 } from '../../math/Mat4';
import { DOMElementBoundingRect, RectCoords } from './DOMElement';
/**
 * An object defining all possible {@link DOMFrustum} instancing parameters
 * @typedef {DOMFrustumParams}
 * @property {?Box3} boundingBox - our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@link Geometry}
 * @property {?Mat4} modelViewProjectionMatrix - {@link ProjectedObject3D} model view projection matrix to use for frustum calculations
 * @property {?DOMElementBoundingRect} containerBoundingRect - the bounding rectangle to check against
 * @property {?RectCoords} DOMFrustumMargins - additional margins to add to [containerBoundingRect]{@link DOMFrustumParams#containerBoundingRect}
 * @property {?function} onReEnterView - callback to run when the {@link ProjectedObject3D} reenters the view frustum
 * @property {?function} onLeaveView - callback to run when the {@link ProjectedObject3D} leaves the view frustum
 */
export interface DOMFrustumParams {
    boundingBox?: Box3;
    modelViewProjectionMatrix?: Mat4;
    containerBoundingRect?: DOMElementBoundingRect;
    DOMFrustumMargins?: RectCoords;
    onReEnterView?: () => void;
    onLeaveView?: () => void;
}
/**
 * DOMFrustum class:
 * Used to check if a {@see Projected3DObject} is currently contained inside a DOM bounding rectangle.
 * Uses a modelViewProjectionMatrix that contains both 3D Object and Camera useful transformation and projection informations.
 * The DOM bounding rectangle to check against usually is the {@see GPURenderer}'s {@see DOMElement} bounding rectangle, unless frustum margins are specified.
 */
export declare class DOMFrustum {
    /**
     * Our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@see Geometry}
     * @type {Box3}
     */
    boundingBox: Box3;
    /**
     * A model view projection matrix defining transformations, usually from a {@see Projected3DObject}, to use for frustum calculations
     * @type {Mat4}
     */
    modelViewProjectionMatrix: Mat4;
    /**
     * The DOM bounding rectangle to check against, usually the renderer DOM Element bounding rectangle
     * @type {DOMElementBoundingRect}
     */
    containerBoundingRect: DOMElementBoundingRect;
    /**
     * Additional margins to add to {@link containerBoundingRect}
     * @type {RectCoords}
     */
    DOMFrustumMargins: RectCoords;
    /**
     * A DOM Element bounding rectangle representing the result of our {@link boundingBox} with the {@link modelViewProjectionMatrix} applied
     * @type {DOMElementBoundingRect}
     */
    projectedBoundingRect: DOMElementBoundingRect;
    /**
     * Callback to run when the transformed {@link boundingBox} reenters the view frustum
     * @type {function}
     */
    onReEnterView: () => void;
    /**
     * Callback to run when the transformed {@link boundingBox} leaves the view frustum
     * @type {function}
     */
    onLeaveView: () => void;
    /**
     * Flag to indicate whether the given transformed {@link boundingBox} is intersecting our view frustum
     * @type {boolean}
     */
    isIntersecting: boolean;
    /**
     * Flag to indicate whether we should update our {@link projectedBoundingRect}
     * @type {boolean}
     */
    shouldUpdate: boolean;
    /**
     * DOMFrustum constructor
     * @param {DOMFrustumParams} parameters - [parameters]{@link DOMFrustumParams} used to create our {@link DOMFrustum}
     */
    constructor({ boundingBox, modelViewProjectionMatrix, containerBoundingRect, DOMFrustumMargins, onReEnterView, onLeaveView, }: DOMFrustumParams);
    /**
     * Set our {@link containerBoundingRect} (called on resize)
     * @param {DOMElementBoundingRect} boundingRect - new bounding rectangle
     */
    setContainerBoundingRect(boundingRect: DOMElementBoundingRect): void;
    /**
     * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
     * @readonly
     * @type {RectCoords}
     */
    get DOMFrustumBoundingRect(): RectCoords;
    /**
     * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox} and then check against intersections
     */
    computeProjectedToDocumentCoords(): void;
    /**
     * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}
     */
    intersectsContainer(): void;
}
