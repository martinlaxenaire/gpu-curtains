import { DOMPosition } from '../core/DOM/DOMElement';
/**
 * Parameters used to create a {@link ScrollManager}
 */
export interface ScrollManagerParams {
    /** Current scroll position */
    scroll?: DOMPosition;
    /** Last scroll deltas */
    delta?: DOMPosition;
    /** Whether the {@link ScrollManager} should listen to the window scroll event or not */
    shouldWatch?: boolean;
    /** Callback to execute each time the {@link ScrollManager#scroll | scroll} values change */
    onScroll?: (delta?: DOMPosition) => void;
}
/**
 * Used to keep track of our scroll position, scroll deltas and trigger an onScroll callback
 * Could either listen to the native scroll event or be hooked to any scroll (natural or virtual) scroll event
 */
export declare class ScrollManager {
    /** Current scroll position */
    scroll: DOMPosition;
    /** Last scroll deltas */
    delta: DOMPosition;
    /** Whether the {@link ScrollManager} should listen to the window scroll event or not */
    shouldWatch: boolean;
    /** Callback to execute each time the {@link scroll} values change */
    onScroll: (delta?: DOMPosition) => void;
    /**
     * ScrollManager constructor
     * @param parameters - {@link ScrollManagerParams | parameters} used to create this {@link ScrollManager}
     */
    constructor({ scroll, delta, shouldWatch, onScroll, }?: ScrollManagerParams);
    /**
     * Called by the scroll event listener
     */
    setScroll(): void;
    /**
     * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
     * Internally called by the scroll event listener
     * Could be called externally as well if the user wants to handle the scroll by himself
     * @param parameters - {@link core/DOM/DOMElement.DOMPosition | scroll values}
     */
    updateScrollValues({ x, y }: DOMPosition): void;
    /**
     * Destroy our scroll manager (just remove our event listner if it had been added previously)
     */
    destroy(): void;
}
