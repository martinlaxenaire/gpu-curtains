import { MeshBaseRenderParams } from './MeshBaseMixin';
import { Renderer } from '../../utils/renderer-utils';
import { DOMElement, DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement';
import { Vec2 } from '../../math/Vec2';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const FullscreenPlane_base: import("./MeshBaseMixin").MixinConstructor<import("./MeshBaseMixin").MeshBaseClass> & {
    new (): {};
};
/**
 * FullscreenPlane class:
 * Create a fullscreen quad, useful for post processing or background effects.
 * TODO!
 * @extends MeshBaseMixin
 * @mixes {class {}}
 */
export declare class FullscreenPlane extends FullscreenPlane_base {
    /** The type of the {@link FullscreenPlane} */
    type: string;
    /** Object defining the  {@link FullscreenPlane} size */
    size: {
        /** document HTML size */
        document: RectBBox;
    };
    /** DOM Element (in fact, the renderer [DOM Element]{@link GPURenderer#domElement}) used to set the [document size]{@link FullscreenPlane#size.document} */
    domElement: DOMElement;
    /**
     * FullscreenPlane constructor
     * @param renderer- [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
     * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link FullscreenPlane}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseRenderParams);
    /**
     * Resize our FullscreenPlane
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Take the pointer [vector]{@link Vec2} position relative to the document and returns it relative to our {@link FullscreenPlane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer [vector]{@link Vec2} coordinates
     * @returns - the mapped [vector]{@link Vec2} coordinates in the [-1, 1] range
     */
    mouseToPlaneCoords(mouseCoords?: Vec2): Vec2;
}
export {};
