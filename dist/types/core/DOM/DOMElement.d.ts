import { ResizeManager, ResizeManagerEntry } from '../../utils/ResizeManager';
/**
 * Defines a rectangular coordinates object
 */
export interface RectCoords {
    /** top position */
    top: number;
    /** right position */
    right: number;
    /** bottom position */
    bottom: number;
    /** left position */
    left: number;
}
export interface RectSize {
    /** width of the rectangle */
    width: number;
    /** height of the rectangle */
    height: number;
}
/**
 * Defines a rectangular bounding box object
 */
export interface RectBBox extends RectSize {
    /** top position of the bounding box */
    top: number;
    /** left position of the bounding box */
    left: number;
}
/**
 * Defines a DOM position object
 */
export interface DOMPosition {
    /** X position */
    x: number;
    /** Y position */
    y: number;
}
/**
 * Defines a complete DOM Element bounding rect object, similar to a {@link DOMRect}
 */
export interface DOMElementBoundingRect extends RectCoords, RectBBox, DOMPosition {
}
/**
 * Parameters used to create a {@link DOMElement}
 */
export interface DOMElementParams {
    element?: string | Element;
    priority?: ResizeManagerEntry['priority'];
    onSizeChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null;
    onPositionChanged?: (boundingRect: DOMElementBoundingRect | null) => void | null;
}
/**
 * DOMElement class:
 * Used to track a DOM Element size and position by using a resize observer provided by {@see ResizeManager}
 */
export declare class DOMElement {
    #private;
    /** The HTML element to track */
    element: HTMLElement;
    /** Priority at which this element {@link onSizeChanged} function must be called */
    priority: ResizeManagerEntry['priority'];
    /** Flag indicating whether the timeout is still running and we should avoid a new computation */
    isResizing: boolean;
    /** Callback to run whenever the {@link element} size changed */
    onSizeChanged: (boundingRect: DOMElementBoundingRect | null) => void | null;
    /** Callback to run whenever the {@link element} position changed */
    onPositionChanged: (boundingRect: DOMElementBoundingRect | null) => void | null;
    /** The {@link ResizeManager} used, basically a wrapper around a {@link ResizeObserver} */
    resizeManager: ResizeManager;
    /** Current  {@link element} bounding rectangle */
    _boundingRect: DOMElementBoundingRect;
    /**
     * DOMElement constructor
     * @param parameters - parameters used to create our DOMElement
     * @param {HTMLElement=} parameters.element - DOM HTML element to track
     * @param {function=} parameters.onSizeChanged - callback to run when element's size changed
     * @param {function=} parameters.onPositionChanged - callback to run when element's position changed
     */
    constructor({ element, priority, onSizeChanged, onPositionChanged, }?: DOMElementParams);
    /**
     * Check whether 2 bounding rectangles are equals
     * @param rect1 - first bounding rectangle
     * @param rect2 - second bounding rectangle
     * @returns - whether the rectangles are equals or not
     */
    compareBoundingRect(rect1: DOMRect | DOMElementBoundingRect, rect2: DOMRect | DOMElementBoundingRect): boolean;
    /**
     * Get or set our element's bounding rectangle
     * @readonly
     */
    get boundingRect(): DOMElementBoundingRect;
    set boundingRect(boundingRect: DOMElementBoundingRect);
    /**
     * Update our element bounding rectangle because the scroll position has changed
     * @param delta - scroll delta values along X and Y axis
     */
    updateScrollPosition(delta?: DOMPosition): void;
    /**
     * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
     * @param boundingRect - new bounding rectangle
     */
    setSize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy(): void;
}
