import { Shadow, ShadowBaseParams } from './Shadow';
import { CameraRenderer } from '../renderers/utils';
import { OrthographicCamera, OrthographicCameraBaseOptions } from '../cameras/OrthographicCamera';
import { Input } from '../../types/BindGroups';
import { DirectionalLight } from '../lights/DirectionalLight';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code';
import { ShaderOptions } from '../../types/Materials';
/**
 * Base parameters used to create a {@link DirectionalShadow}.
 */
export interface DirectionalShadowParams extends ShadowBaseParams {
    /** {@link DirectionalLight} used to create the {@link DirectionalShadow}. */
    light: DirectionalLight;
    /** {@link OrthographicCameraBaseOptions | Orthographic projection parameters} to use. */
    camera?: OrthographicCameraBaseOptions;
}
/** @ignore */
export declare const directionalShadowStruct: Record<string, Input>;
/**
 * Create a shadow map from a {@link DirectionalLight}  by rendering to a depth texture using a {@link OrthographicCamera}.
 */
export declare class DirectionalShadow extends Shadow {
    /** {@link DirectionalLight} associated with this {@link DirectionalShadow}. */
    light: DirectionalLight;
    /** Shadow {@link OrthographicCamera} to use for shadow calculations. */
    camera: OrthographicCamera;
    /** Options used to create this {@link DirectionalShadow}. */
    options: DirectionalShadowParams;
    /**
     * DirectionalShadow constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalShadow}.
     * @param parameters - {@link DirectionalShadowParams | parameters} used to create this {@link DirectionalShadow}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera, }?: DirectionalShadowParams);
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
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed or when the {@link renderer} has changed.
     */
    reset(): void;
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture(): void;
    /**
     * Get the default depth pass vertex shader for this {@link Shadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings, geometry }: VertexShaderInputBaseParams): ShaderOptions;
}
