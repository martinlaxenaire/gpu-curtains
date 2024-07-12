import { Light, LightBaseParams, LightsType } from './Light';
import { Vec3 } from '../../math/Vec3';
import { DirectionalShadow, DirectionalShadowParams } from '../shadows/DirectionalShadow';
export interface DirectionalLightBaseParams extends LightBaseParams {
    position?: Vec3;
    target?: Vec3;
    shadow?: DirectionalShadowParams;
}
export declare class DirectionalLight extends Light {
    #private;
    target: Vec3;
    options: DirectionalLightBaseParams;
    shadow: DirectionalShadow;
    constructor(renderer: any, { color, intensity, position, target, shadow, }?: DirectionalLightBaseParams);
    reset(): void;
    setDirection(): void;
    /** @ignore */
    applyScale(): void;
    /** @ignore */
    applyTransformOrigin(): void;
    /**
     * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the matrix translation.
     */
    updateMatrixStack(): void;
    onMaxLightOverflow(lightsType: LightsType): void;
    destroy(): void;
}
