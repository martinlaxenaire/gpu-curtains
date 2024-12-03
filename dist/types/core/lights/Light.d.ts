import { Vec3 } from '../../math/Vec3';
import { CameraRenderer } from '../renderers/utils';
import { BufferBinding } from '../bindings/BufferBinding';
import { Object3D } from '../objects3D/Object3D';
import { DirectionalLight } from './DirectionalLight';
import { PointLight } from './PointLight';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/** Defines all types of lights. */
export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights';
/** Defines all types of shadow casting lights. */
export type ShadowCastingLights = DirectionalLight | PointLight;
/**
 * Base parameters used to create a {@link Light}.
 */
export interface LightBaseParams {
    /** The {@link Light} color. Default to `Vec3(1)`. */
    color?: Vec3;
    /** The {@link Light} intensity. Default to `1`. */
    intensity?: number;
}
/**
 * Parameters used to create a {@link Light}.
 */
export interface LightParams extends LightBaseParams {
    /** Index of this {@link Light}, i.e. the number of time a {@link Light} of this type has been created. */
    type?: string | LightsType;
}
/**
 * Used as a base class to create a light.
 */
export declare class Light extends Object3D {
    #private;
    /** {@link LightsType | Type of the light}. */
    type: string | LightsType;
    /** The universal unique id of this {@link Light} */
    readonly uuid: string;
    /** Index of this {@link Light}, i.e. the number of time a {@link Light} of this type has been created. */
    index: number;
    /** {@link CameraRenderer} used by this {@link Light} */
    renderer: CameraRenderer;
    /** Options used to create this {@link Light}. */
    options: LightBaseParams;
    /** Current {@link Vec3 | color} of this {@link Light}. */
    color: Vec3;
    /** {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} that holds all the bindings to send to the shaders. */
    rendererBinding: BufferBinding | null;
    /**
     * Light constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link Light}.
     * @param parameters - {@link LightParams | parameters} used to create this {@link Light}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { color, intensity, type }?: LightParams);
    /**
     * Set or reset this light {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: CameraRenderer | GPUCurtains): void;
    /**
     * Set or reset this {@link Light} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding(): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed.
     */
    reset(): void;
    /**
     * Get this {@link Light} intensity.
     * @returns - The {@link Light} intensity.
     */
    get intensity(): number;
    /**
     * Set this {@link Light} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Light} intensity.
     */
    set intensity(value: number);
    /**
     * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
     * @param propertyKey - name of the property to update.
     * @param value - new value of the property.
     */
    onPropertyChanged(propertyKey: string, value: Vec3 | number): void;
    /**
     * Tell the {@link renderer} that the maximum number for this {@link type} of light has been overflown.
     * @param lightsType - {@link type} of light.
     */
    onMaxLightOverflow(lightsType: LightsType): void;
    /**
     * Remove this {@link Light} from the {@link renderer} and destroy it.
     */
    remove(): void;
    /**
     * Destroy this {@link Light}.
     */
    destroy(): void;
}
