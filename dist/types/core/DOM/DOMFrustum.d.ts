import { Box3 } from '../../math/Box3';
import { Mat4 } from '../../math/Mat4';
import { DOMElementBoundingRect, RectBBox, RectCoords } from './DOMElement';
import { Vec3 } from '../../math/Vec3';
/**
 * An object defining all possible {@link DOMFrustum} class instancing parameters
 */
export interface DOMFrustumParams {
    /** our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@link core/geometries/Geometry.Geometry | Geometry} */
    boundingBox?: Box3;
    /** {@link core/objects3D/ProjectedObject3D.ProjectedObject3D#modelViewProjectionMatrix | model view projection matrix} to use for frustum calculations */
    modelViewProjectionMatrix?: Mat4;
    /** the {@link DOMElementBoundingRect | bounding rectangle} to check against */
    containerBoundingRect?: DOMElementBoundingRect;
    /** additional margins to add to {@link containerBoundingRect} */
    DOMFrustumMargins?: RectCoords;
    /** callback to run when the {@link DOMFrustum#projectedBoundingRect | projectedBoundingRect} reenters the view frustum */
    onReEnterView?: () => void;
    /** callback to run when the {@link DOMFrustum#projectedBoundingRect | projectedBoundingRect} leaves the view frustum */
    onLeaveView?: () => void;
}
/**
 * Used to check if a {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} is currently contained inside a DOM bounding rectangle.
 *
 * Uses a {@link core/objects3D/ProjectedObject3D.ProjectedObject3D#modelViewProjectionMatrix | model view projection matrix} that contains both useful {@link core/objects3D/ProjectedObject3D.ProjectedObject3D#transforms | Object3D transforms} and {@link core/cameras/Camera.Camera | Camera} projection information.
 * The DOM bounding rectangle to check against usually is the {@link core/renderers/GPURenderer.GPURenderer | renderer}'s {@link core/DOM/DOMElement.DOMElement | DOMElement} bounding rectangle, unless frustum margins are specified.
 */
export declare class DOMFrustum {
    /** Our 3D Object bounding box, i.e. size in world space before any transform. Usually defined by a {@link core/geometries/Geometry.Geometry | Geometry} */
    boundingBox: Box3;
    /** Oriented bounding {@link Box3} in clip space. */
    clipSpaceOBB: Box3;
    /** A model view projection matrix defining transformations, usually from a {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}, to use for frustum calculations */
    modelViewProjectionMatrix: Mat4;
    /** The DOM bounding rectangle to check against, usually the renderer DOM Element bounding rectangle */
    containerBoundingRect: DOMElementBoundingRect;
    /** Additional margins to add to {@link containerBoundingRect} */
    DOMFrustumMargins: RectCoords;
    /** Computed {@link RectBBox | rectangle} in clip space/normalized device coordinates. */
    clipSpaceBoundingRect: RectBBox;
    /** A DOM Element bounding rectangle representing the result of our {@link boundingBox} with the {@link modelViewProjectionMatrix} applied */
    projectedBoundingRect: DOMElementBoundingRect;
    /** Callback to run when the {@link projectedBoundingRect} reenters the view frustum */
    onReEnterView: () => void;
    /** Callback to run when the {@link projectedBoundingRect} leaves the view frustum */
    onLeaveView: () => void;
    /** Flag to indicate whether the given {@link projectedBoundingRect} is intersecting our view frustum */
    isIntersecting: boolean;
    /**
     * DOMFrustum constructor
     * @param {DOMFrustumParams} parameters - {@link DOMFrustumParams | parameters} used to create our {@link DOMFrustum}
     */
    constructor({ boundingBox, modelViewProjectionMatrix, containerBoundingRect, DOMFrustumMargins, onReEnterView, onLeaveView, }: DOMFrustumParams);
    /**
     * Set our {@link containerBoundingRect} (called on resize)
     * @param boundingRect - new bounding rectangle
     */
    setContainerBoundingRect(boundingRect: DOMElementBoundingRect): void;
    /**
     * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
     * @readonly
     */
    get DOMFrustumBoundingRect(): RectCoords;
    /**
     * Compute the oriented bounding box in clip space.
     */
    computeClipSpaceOBB(): void;
    /**
     * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox}, i.e. apply OBB to document coordinates and set {@link projectedBoundingRect}.
     */
    setDocumentCoordsFromClipSpaceOBB(): void;
    /**
     * Apply the bounding sphere in clip space to document coordinates and set {@link projectedBoundingRect}.
     * @param boundingSphere - bounding sphere in clip space.
     */
    setDocumentCoordsFromClipSpaceSphere(boundingSphere?: {
        center: Vec3;
        radius: number;
    }): void;
    /**
     * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}.
     */
    intersectsContainer(): void;
}
