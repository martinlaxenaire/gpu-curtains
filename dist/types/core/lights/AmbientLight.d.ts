import { Light, LightBaseParams } from './Light';
export declare class AmbientLight extends Light {
    constructor(renderer: any, { color, intensity }?: LightBaseParams);
    /** @ignore */
    applyRotation(): void;
    /** @ignore */
    applyPosition(): void;
    /** @ignore */
    applyScale(): void;
    /** @ignore */
    applyTransformOrigin(): void;
}
