import { MeshBaseParams } from './MeshBaseMixin';
import { Renderer } from '../../utils/renderer-utils';
import { DOMElement } from '../DOM/DOMElement';
import { Vec2 } from '../../math/Vec2';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement';
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
    type: string;
    size: {
        document: RectBBox;
    };
    domElement: DOMElement;
    /**
     * FullscreenPlane constructor
     * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
     * @param {MeshBaseParams} parameters - our Mesh base parameters
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseParams);
    /**
     * Resize our FullscreenPlane
     * @param {?DOMElementBoundingRect} boundingRect - the new bounding rectangle
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Convert a mouse coordinate to plane coordinates ranging from [-1, 1]
     * @param {?Vec2} mouseCoords - mouse or pointer coordinates as a Vec2
     * @returns {Vec2} - the mapped coordinates in the [-1, 1] range
     */
    mouseToPlaneCoords(mouseCoords?: Vec2): Vec2;
}
export {};
