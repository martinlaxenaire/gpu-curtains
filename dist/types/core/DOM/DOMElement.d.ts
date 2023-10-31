import { ResizeManager } from '../../utils/ResizeManager';
export interface RectCoords {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface RectBBox {
    width: number;
    height: number;
    top: number;
    left: number;
}
export interface DOMPosition {
    x: number;
    y: number;
}
export interface DOMElementBoundingRect extends RectCoords, RectBBox, DOMPosition {
}
/**
 * DOMElement class:
 * Used to track a DOM Element size and position by using a resize observer provided by {@see ResizeManager}
 */
export declare class DOMElement {
    #private;
    element: HTMLElement;
    isResizing: boolean;
    onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null;
    onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null;
    resizeManager: ResizeManager;
    _boundingRect: DOMElementBoundingRect;
    /**
     * DOMElement constructor
     * @param {Object=} parameters - parameters used to create our DOMElement
     * @param {HTMLElement=} parameters.element - DOM HTML element to track
     * @param {function=} parameters.onSizeChanged - callback to run when element's size changed
     * @param {function=} parameters.onPositionChanged - callback to run when element's position changed
     */
    constructor({ element, onSizeChanged, onPositionChanged, }?: {
        element?: string | HTMLElement;
        onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null;
        onPositionChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null;
    });
    /**
     * Check whether 2 bounding rectangles are equals
     * @param {(DOMRect | DOMElementBoundingRect)} rect1 - first bounding rectangle
     * @param {(DOMRect | DOMElementBoundingRect)} rect2 - second bounding rectangle
     * @returns {boolean}
     */
    compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean;
    /**
     * Get or set our element's bounding rectangle
     * @readonly
     * @type {DOMElementBoundingRect}
     */
    get boundingRect(): DOMElementBoundingRect;
    set boundingRect(boundingRect: DOMElementBoundingRect);
    /**
     * Update our element bounding rectangle because the scroll position has changed
     * @param {number} lastXDelta - delta along X axis
     * @param {number} lastYDelta - delta along Y axis
     */
    updateScrollPosition(lastXDelta: number, lastYDelta: number): void;
    /**
     * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
     * @param {DOMElementBoundingRect=} boundingRect - new bounding rectangle
     */
    setSize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy(): void;
}
