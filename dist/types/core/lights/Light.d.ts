import { Vec3 } from '../../math/Vec3';
import { CameraRenderer } from '../renderers/utils';
import { BufferBinding } from '../bindings/BufferBinding';
import { Object3D } from '../objects3D/Object3D';
import { DirectionalLight } from './DirectionalLight';
import { PointLight } from './PointLight';
export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights';
export type ShadowCastingLights = DirectionalLight | PointLight;
export interface LightBaseParams {
    color?: Vec3;
    intensity?: number;
}
export interface LightParams extends LightBaseParams {
    index?: number;
    type?: string | LightsType;
}
export declare class Light extends Object3D {
    #private;
    type: string | LightsType;
    uuid: string;
    index: number;
    renderer: CameraRenderer;
    options: LightBaseParams;
    color: Vec3;
    rendererBinding: BufferBinding | null;
    constructor(renderer: CameraRenderer, { color, intensity, index, type }?: LightParams);
    setRendererBinding(): void;
    reset(): void;
    get intensity(): number;
    set intensity(value: number);
    onPropertyChanged(propertyKey: string, value: Vec3 | number): void;
    onMaxLightOverflow(lightsType: LightsType): void;
    remove(): void;
    destroy(): void;
}
