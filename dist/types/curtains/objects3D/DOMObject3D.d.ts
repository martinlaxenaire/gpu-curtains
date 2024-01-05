import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { DOMElement, DOMElementBoundingRect, DOMElementParams, DOMPosition, RectBBox } from '../../core/DOM/DOMElement';
import { Vec3 } from '../../math/Vec3';
import { Object3DTransforms } from '../../core/objects3D/Object3D';
/** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
export interface DOMObject3DSize {
    /** The {@link DOMObject3D} bounding box in world space */
    world: RectBBox;
    /** The {@link DOMObject3D} bounding box in document space */
    document: RectBBox;
}
/**
 * Defines all necessary [vectors]{@link math/Vec3.Vec3}/[quaternions]{@link math/Quat.Quat} to compute a 3D [model matrix]{@link math/Mat4.Mat4} based on a DOM [HTML Element]{@link HTMLElement}
 */
export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
    /** Transformation origin object */
    origin: {
        /** Transformation origin [vector]{@link math/Vec3.Vec3} relative to the {@link DOMObject3D} */
        model: Vec3;
        /** Transformation origin [vector]{@link math/Vec3.Vec3} relative to the 3D world */
        world: Vec3;
    };
    /** Position object */
    position: {
        /** Position [vector]{@link math/Vec3.Vec3} relative to the 3D world */
        world: Vec3;
        /** Additional translation [vector]{@link Vec3} relative to the DOM document */
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
 * DOMObject3D class:
 * Used to create 3D objects with transform and projection matrices based on a {@link Camera} and an [HTML Element]{@link HTMLElement}
 * @extends ProjectedObject3D
 */
export declare class DOMObject3D extends ProjectedObject3D {
    #private;
    /** [Curtains renderer]{@link GPUCurtainsRenderer} used to create this {@link DOMObject3D} */
    renderer: GPUCurtainsRenderer;
    /** Defines the {@link DOMObject3D} bounding boxes in both document and world spaces */
    size: DOMObject3DSize;
    /** {@link DOMElement} used to track the given [HTML Element]{@link HTMLElement} size change */
    domElement: DOMElement;
    /** Whether to automatically update the {@link DOMObject3D} document and world positions on scroll */
    watchScroll: boolean;
    /** [Transformation object]{@link DOMObject3DTransforms} of the {@link DOMObject3D} */
    transforms: DOMObject3DTransforms;
    /**
     * DOMObject3D constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
     * @param parameters - [parameters]{@link DOMObject3DParams} used to create this {@link DOMObject3D}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: DOMElementParams['element'], parameters: DOMObject3DParams);
    /**
     * Set the [DOMElement]{@link DOMObject3D#domElement}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setDOMElement(element: DOMElementParams['element']): void;
    /**
     * Update size and position when the [DOMElement]{@link DOMObject3D#domElement} position changed
     * @param boundingRect - the new bounding rectangle
     */
    onPositionChanged(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Reset the [DOMElement]{@link DOMObject3D#domElement}
     * @param element - the new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    resetDOMElement(element: string | HTMLElement): void;
    /**
     * Update the {@link DOMObject3D} sizes and position
     */
    updateSizeAndPosition(): void;
    /**
     * Update the {@link DOMObject3D} sizes, position and projection
     */
    shouldUpdateMatrixStack(): void;
    /**
     * Resize the {@link DOMObject3D}
     * @param boundingRect - new [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Get the [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     * @readonly
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Set our transforms properties and [onChange]{@link math/Vec3.Vec3#onChange} callbacks
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
     * Get the [DOMObject3D DOM element]{@link DOMObject3D#domElement} scale in world space
     * @readonly
     */
    get DOMObjectWorldScale(): Vec3;
    /**
     * Get the {@link DOMObject3D} scale in world space (accounting for [scale]{@link DOMObject3D#scale})
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
     * Set the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyPosition(): void;
    /**
     * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyDocumentPosition(): void;
    /**
     * Apply the transform origin and set the {@link DOMObject3D} world transform origin
     */
    applyTransformOrigin(): void;
    /**
     * Update the [model matrix]{@link DOMObject3D#modelMatrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale
     */
    updateModelMatrix(): void;
    /**
     * Convert a document position [vector]{@link math/Vec3.Vec3} to a world position [vector]{@link math/Vec3.Vec3}
     * @param vector - document position [vector]{@link math/Vec3.Vec3} converted to world space
     */
    documentToWorldSpace(vector?: Vec3): Vec3;
    /**
     * Set the [DOMOBject3D world size]{@link DOMObject3D#size.world} and set the {@link DOMObject3D} world transform origin
     */
    setWorldSizes(): void;
    /**
     * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
     */
    setWorldTransformOrigin(): void;
    /**
     * Update the [DOMOBject3D DOMElement]{@link DOMObject3D#domElement} scroll position
     * @param delta - last [scroll delta values]{@link utils/ScrollManager.ScrollManager.delta}
     */
    updateScrollPosition(delta?: DOMPosition): void;
    /**
     * Destroy our {@link DOMObject3D}
     */
    destroy(): void;
}
