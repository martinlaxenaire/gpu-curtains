import { Shadow, ShadowBaseParams } from './Shadow';
import { CameraRenderer } from '../renderers/utils';
import { Mat4, OrthographicProjectionParams } from '../../math/Mat4';
import { Vec3 } from '../../math/Vec3';
import { Input } from '../../types/BindGroups';
import { DirectionalLight } from '../lights/DirectionalLight';
/** Defines the orthographic shadow camera. */
export interface OrthographicShadowCamera extends OrthographicProjectionParams {
    /** @ignore */
    _left: number;
    /** @ignore */
    _right: number;
    /** @ignore */
    _bottom: number;
    /** @ignore */
    _top: number;
    /** @ignore */
    _near: number;
    /** @ignore */
    _far: number;
    /** Orthographic camera projection {@link Mat4}. */
    projectionMatrix: Mat4;
    /** Orthographic camera view {@link Mat4}. */
    viewMatrix: Mat4;
    /** Up {@link Vec3} used to compute the view {@link Mat4}. */
    up: Vec3;
}
/**
 * Base parameters used to create a {@link DirectionalShadow}.
 */
export interface DirectionalShadowParams extends ShadowBaseParams {
    /** {@link DirectionalLight} used to create the {@link DirectionalShadow}. */
    light: DirectionalLight;
    /** {@link OrthographicProjectionParams | Orthographic projection parameters} to use. */
    camera?: OrthographicProjectionParams;
}
/** @ignore */
export declare const directionalShadowStruct: Record<string, Input>;
/**
 * Create a shadow map from a {@link DirectionalLight} by rendering to a depth texture using a view {@link Mat4} based on the {@link DirectionalLight} position and target and an {@link OrthographicShadowCamera | orthographic shadow camera} {@link Mat4}.
 */
export declare class DirectionalShadow extends Shadow {
    /** {@link DirectionalLight} associated with this {@link DirectionalShadow}. */
    light: DirectionalLight;
    /** {@link OrthographicShadowCamera | Orthographic shadow camera} to use for shadow calculations. */
    camera: OrthographicShadowCamera;
    /** Options used to create this {@link DirectionalShadow}. */
    options: DirectionalShadowParams;
    /**
     * DirectionalShadow constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalShadow}.
     * @param parameters - {@link DirectionalShadowParams | parameters} used to create this {@link DirectionalShadow}.
     */
    constructor(renderer: CameraRenderer, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera, }?: DirectionalShadowParams);
    /**
     * Set or reset this {@link DirectionalShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding(): void;
    /**
     * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
     * Called internally by the associated {@link DirectionalLight} if any shadow parameters are specified when creating it. Can also be called directly.
     * @param parameters - parameters to use for this {@link DirectionalShadow}.
     */
    cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera }?: Omit<DirectionalShadowParams, "light">): void;
    /**
     * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link DirectionalShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
     */
    init(): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed.
     */
    reset(): void;
    /**
     * Update the {@link DirectionalShadow#camera.projectionMatrix | camera orthographic projection matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    updateProjectionMatrix(): void;
    /**
     * Update the {@link DirectionalShadow#camera.viewMatrix | camera view matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param position - {@link Vec3} to use as position for the {@link DirectionalShadow#camera.viewMatrix | camera view matrix}, based on the {@link light} position.
     * @param target - {@link Vec3} to use as target for the {@link DirectionalShadow#camera.viewMatrix | camera view matrix}, based on the {@link light} target.
     */
    updateViewMatrix(position?: Vec3, target?: Vec3): void;
}
