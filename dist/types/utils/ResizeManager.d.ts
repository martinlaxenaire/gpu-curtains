/**
 * Defines a {@link ResizeManager} entry
 */
export interface ResizeManagerEntry {
    /** {@link HTMLElement} to track */
    element: HTMLElement;
    /** Function to execute when the [element]{@link ResizeManagerEntry#element} is resized */
    callback: () => void | null;
}
/**
 * ResizeManager class:
 * Tiny wrapper around {@link ResizeObserver} used to execute callbacks when given HTMLElement size changes.
 */
export declare class ResizeManager {
    /** Whether we should add elements to our [ResizeObserver]{@link ResizeManager#resizeObserver} or not */
    shouldWatch: boolean;
    /** Array of [entries]{@link ResizeManagerEntry} */
    entries: ResizeManagerEntry[];
    /** {@link ResizeObserver} used */
    resizeObserver: ResizeObserver;
    /**
     * ResizeManager constructor
     */
    constructor();
    /**
     * Set [shouldWatch]{@link ResizeManager#shouldWatch}
     * @param shouldWatch - whether to watch or not
     */
    useObserver(shouldWatch?: boolean): void;
    /**
     * Track an [element]{@link HTMLElement} size change and execute a callback function when it happens
     * @param entry - [entry]{@link ResizeManagerEntry} to watch
     */
    observe({ element, callback }: ResizeManagerEntry): void;
    /**
     * Unobserve an [element]{@link HTMLElement} and remove it from our [entries array]{@link ResizeManager#entries}
     * @param element - [element]{@link HTMLElement} to unobserve
     */
    unobserve(element: HTMLElement): void;
    /**
     * Destroy our {@link ResizeManager}
     */
    destroy(): void;
}
/** @exports @const resizeManager - {@link ResizeManager} class object */
export declare const resizeManager: ResizeManager;
