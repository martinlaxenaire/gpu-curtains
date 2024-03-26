import { DOMElement } from '../core/DOM/DOMElement';
/**
 * Defines a {@link ResizeManager} entry
 */
export interface ResizeManagerEntry {
    /** {@link HTMLElement} to track */
    element: DOMElement['element'] | Element;
    /** Priority in which to call the callback function */
    priority?: number;
    /** Function to execute when the {@link element} is resized */
    callback: () => void | null;
}
/**
 * Tiny wrapper around {@link ResizeObserver} used to execute callbacks when given {@link HTMLElement} size changes.
 */
export declare class ResizeManager {
    /** Whether we should add elements to our {@link resizeObserver} or not */
    shouldWatch: boolean;
    /** Array of {@link ResizeManagerEntry | entries} */
    entries: ResizeManagerEntry[];
    /** {@link ResizeObserver} used */
    resizeObserver: ResizeObserver | undefined;
    /**
     * ResizeManager constructor
     */
    constructor();
    /**
     * Set {@link shouldWatch}
     * @param shouldWatch - whether to watch or not
     */
    useObserver(shouldWatch?: boolean): void;
    /**
     * Track an {@link HTMLElement} size change and execute a callback function when it happens
     * @param entry - {@link ResizeManagerEntry | entry} to watch
     */
    observe({ element, priority, callback }: ResizeManagerEntry): void;
    /**
     * Unobserve an {@link HTMLElement} and remove it from our {@link entries} array
     * @param element - {@link HTMLElement} to unobserve
     */
    unobserve(element: DOMElement['element'] | Element): void;
    /**
     * Destroy our {@link ResizeManager}
     */
    destroy(): void;
}
/** @exports @const resizeManager - {@link ResizeManager} class object */
export declare const resizeManager: ResizeManager;
