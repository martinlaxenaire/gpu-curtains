import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { DOMElement, DOMElementBoundingRect, DOMElementParams, DOMPosition, RectBBox } from '../../core/DOM/DOMElement';
import { Vec2 } from '../../math/Vec2';
import { Vec3 } from '../../math/Vec3';
import { Object3DTransforms } from '../../core/objects3D/Object3D';
import { Box3 } from '../../math/Box3';
/** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
export interface DOMObject3DSize {
    /** Whether we should update the computed sizes before updating the matrices. */
    shouldUpdate: boolean;
    /** The {@link DOMObject3D} bounding box in document space */
    document: RectBBox;
    /** Normalized world size represent the size ratio of the DOM element compared to its container (the renderer DOM element). */
    normalizedWorld: {
        /** 2D size of the {@link DOMObject3D} relative to the document, in the [0, 1] range. */
        size: Vec2;
        /** 2D position of the {@link DOMObject3D} relative to the document, in the [-1, 1] range, [0, 0] being at the container center. */
        position: Vec2;
    };
    /** Camera world size and position are the {@link normalizedWorld} size and positions accounting for camera screen ratio (visible height / width in world unit) */
    cameraWorld: {
        /** 2D size of the {@link DOMObject3D} relative to the camera field of view and size. */
        size: Vec2;
    };
    /** Scaled world size and position are the {@link cameraWorld} size and position scaled by the geometry bounding box, because the geometry vertices are not always in the [-1, 1] range. */
    scaledWorld: {
        /** 3D size of the {@link DOMObject3D} relative to the camera field of view and size and the geometry bounding box. */
        size: Vec3;
        /** 3D position of the {@link DOMObject3D} relative to the camera field of view and size and the normalized coordinates. */
        position: Vec3;
    };
}
/**
 * Defines all necessary {@link Vec3 | vectors}/{@link math/Quat.Quat | quaternions} to compute a 3D {@link math/Mat4.Mat4 | model matrix} based on a DOM {@link HTMLElement}
 */
export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
    /** Transformation origin object */
    origin: {
        /** Transformation origin {@link Vec3 | vector} relative to the {@link DOMObject3D} */
        model: Vec3;
        /** Transformation origin {@link Vec3 | vector} relative to the 3D world */
        world: Vec3;
    };
    /** Position object */
    position: {
        /** Position {@link Vec3 | vector} relative to the 3D world */
        world: Vec3;
        /** Additional translation {@link Vec3 | vector} relative to the DOM document */
        document: Vec3;
    };
}
/**
 * Parameters used to create a {@link DOMObject3D}
 */
export interface DOMObject3DParams {
    /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
    watchScroll?: boolean;
}
/**
 * This special kind of {@link ProjectedObject3D} uses an {@link HTMLElement} to convert the corresponding X and Y {@link DOMObject3D#scale | scale} and {@link DOMObject3D#position | position} relative to the 3D world space.
 *
 * Internally used by the {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} and {@link curtains/meshes/Plane.Plane | Plane}, but can also be used as any {@link core/meshes/Mesh.Mesh | Mesh} {@link parent} to map it with an {@link HTMLElement} size and position values.
 */
export declare class DOMObject3D extends ProjectedObject3D {
    #private;
    /** {@link GPUCurtainsRenderer} used to create this {@link DOMObject3D} */
    renderer: GPUCurtainsRenderer;
    /** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
    size: DOMObject3DSize;
    /** {@link DOMElement} used to track the given {@link HTMLElement} size change */
    domElement: DOMElement;
    /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
    watchScroll: boolean;
    /** {@link DOMObject3DTransforms | Transformation object} of the {@link DOMObject3D} */
    transforms: DOMObject3DTransforms;
    /** Helper {@link Box3 | bounding box} used to map the 3D object onto the 2D DOM element. */
    boundingBox: Box3;
    /** function assigned to the {@link onAfterDOMElementResize} callback */
    _onAfterDOMElementResizeCallback: () => void;
    /**
     * DOMObject3D constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
     * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters?: DOMObject3DParams);
    /**
     * Set the {@link domElement | DOM Element}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setDOMElement(element: DOMElementParams['element']): void;
    /**
     * Update size and position when the {@link domElement | DOM Element} position changed
     * @param boundingRect - the new bounding rectangle
     */
    onPositionChanged(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Reset the {@link domElement | DOMElement}
     * @param element - the new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    resetDOMElement(element: string | HTMLElement): void;
    /**
     * Resize the {@link DOMObject3D}
     * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     * @readonly
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Set our transforms properties and {@link Vec3#onChange | onChange vector} callbacks
     */
    setTransforms(): void;
    /**
     * Get the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
     */
    get documentPosition(): Vec3;
    /**
     * Set the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
     * @param value - additional translation relative to the document to apply
     */
    set documentPosition(value: Vec3);
    /**
     * Get the {@link domElement | DOM element} scale in world space
     * @readonly
     */
    get DOMObjectWorldScale(): Vec3;
    /**
     * Get the {@link DOMObject3D} scale in world space (accounting for {@link scale})
     * @readonly
     */
    get worldScale(): Vec3;
    /**
     * Get the {@link DOMObject3D} position in world space
     * @readonly
     */
    get worldPosition(): Vec3;
    /**
     * Get the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
     */
    get transformOrigin(): Vec3;
    /**
     * Set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
     * @param value - new transform origin
     */
    set transformOrigin(value: Vec3);
    /**
     * Get the {@link DOMObject3D} transform origin in world space
     */
    get worldTransformOrigin(): Vec3;
    /**
     * Set the {@link DOMObject3D} transform origin in world space
     * @param value - new world space transform origin
     */
    set worldTransformOrigin(value: Vec3);
    /**
     * Check whether at least one of the matrix should be updated
     */
    shouldUpdateMatrices(): void;
    /**
     * Set the {@link DOMObject3D#size.shouldUpdate | size shouldUpdate} flag to true to compute the new sizes before next matrices calculations.
     */
    shouldUpdateComputedSizes(): void;
    /**
     * Update the {@link DOMObject3D} sizes and position
     */
    updateSizeAndPosition(): void;
    /**
     * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyDocumentPosition(): void;
    /**
     * Apply the transform origin and set the {@link DOMObject3D} world transform origin
     */
    applyTransformOrigin(): void;
    /**
     * Update the {@link modelMatrix | model matrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale
     */
    updateModelMatrix(): void;
    /**
     * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
     * @param vector - document position {@link Vec3 | vector} converted to world space
     */
    documentToWorldSpace(vector?: Vec3): Vec3;
    /**
     * Compute the {@link DOMObject3D#size | world sizes}
     */
    computeWorldSizes(): void;
    /**
     * Compute and set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
     */
    setWorldSizes(): void;
    /**
     * Set the {@link worldScale} accounting for scaled world size and {@link DOMObjectDepthScaleRatio}
     */
    setWorldScale(): void;
    /**
     * Set {@link DOMObjectDepthScaleRatio}. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis.
     * @param value - depth scale ratio value to use
     */
    set DOMObjectDepthScaleRatio(value: number);
    /**
     * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
     */
    setWorldTransformOrigin(): void;
    /**
     * Update the {@link domElement | DOM Element} scroll position
     * @param delta - last {@link utils/ScrollManager.ScrollManager.delta | scroll delta values}
     */
    updateScrollPosition(delta?: DOMPosition): void;
    /**
     * Callback to execute just after the {@link domElement} has been resized.
     * @param callback - callback to run just after {@link domElement} has been resized
     * @returns - our {@link DOMObject3D}
     */
    onAfterDOMElementResize(callback: () => void): DOMObject3D;
    /**
     * Destroy our {@link DOMObject3D}
     */
    destroy(): void;
}
