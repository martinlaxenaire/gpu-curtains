export interface ResizeManagerEntry {
    element: HTMLElement;
    callback: () => void | null;
}
export declare class ResizeManager {
    shouldWatch: boolean;
    entries: ResizeManagerEntry[];
    resizeObserver: ResizeObserver;
    constructor();
    useObserver(shouldWatch?: boolean): void;
    observe({ element, callback }: ResizeManagerEntry): void;
    unobserve(element: HTMLElement): void;
    destroy(): void;
}
export declare const resizeManager: ResizeManager;
