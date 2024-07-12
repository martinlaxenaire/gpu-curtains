import { Light, LightBaseParams, LightsType } from './Light';
import { Vec3 } from '../../math/Vec3';
import { PointShadow, PointShadowParams } from '../shadows/PointShadow';
export interface PointLightBaseParams extends LightBaseParams {
    position?: Vec3;
    range?: number;
    shadow?: PointShadowParams;
}
export declare class PointLight extends Light {
    #private;
    options: PointLightBaseParams;
    shadow: PointShadow;
    constructor(renderer: any, { color, intensity, position, range, shadow }?: PointLightBaseParams);
    reset(): void;
    get range(): number;
    set range(value: number);
    setPosition(): void;
    /** @ignore */
    applyScale(): void;
    /** @ignore */
    applyTransformOrigin(): void;
    /**
     * If the {@link modelMatrix | model matrix} has been updated, set the new position from the matrix translation.
     */
    updateMatrixStack(): void;
    onMaxLightOverflow(lightsType: LightsType): void;
    destroy(): void;
}
