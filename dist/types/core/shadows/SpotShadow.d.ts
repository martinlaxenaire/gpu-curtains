import { Shadow, ShadowBaseParams } from './Shadow';
import { CameraRenderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Input } from '../../types/BindGroups';
import { Camera } from '../camera/Camera';
import { SpotLight } from '../lights/SpotLight';
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code';
import { ShaderOptions } from '../../types/Materials';
/**
 * Base parameters used to create a {@link SpotShadow}.
 */
export interface SpotShadowParams extends ShadowBaseParams {
    /** {@link SpotLight} used to create the {@link SpotShadow}. */
    light: SpotLight;
}
/** @ignore */
export declare const spotShadowStruct: Record<string, Input>;
/**
 * Create a shadow map from a {@link SpotLight} by rendering to a depth texture using a {@link Camera}.
 */
export declare class SpotShadow extends Shadow {
    /** {@link SpotLight} associated with this {@link SpotShadow}. */
    light: SpotLight;
    /** Options used to create this {@link SpotShadow}. */
    options: SpotShadowParams;
    /** Shadow {@link Camera} used for shadow calculations. */
    camera: Camera;
    /** Focus of the {@link camera}. Default to `1`. */
    focus: number;
    constructor(renderer: CameraRenderer | GPUCurtains, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, }?: SpotShadowParams);
    /**
     * Set or reset this {@link SpotShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding(): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link SpotLight} has been overflowed or when the {@link renderer} has changed.
     */
    reset(): void;
    /**
     * Set the {@link Camera#fov | camera fov} based on the {@link SpotLight#angle | SpotLight angle}.
     */
    setCameraFov(): void;
    /**
     * Reset the {@link depthTexture} when the {@link depthTextureSize} changes and update camera ratio.
     */
    onDepthTextureSizeChanged(): void;
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture(): void;
    /**
     * Get the default depth pass vertex shader for this {@link SpotShadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings, geometry }: VertexShaderInputBaseParams): ShaderOptions;
}
