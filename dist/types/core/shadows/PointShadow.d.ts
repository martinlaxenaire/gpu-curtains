import { Shadow, ShadowBaseParams } from './Shadow';
import { CameraRenderer } from '../renderers/utils';
import { Mat4, PerspectiveProjectionParams } from '../../math/Mat4';
import { Vec3 } from '../../math/Vec3';
import { PointLight } from '../lights/PointLight';
import { Input } from '../../types/BindGroups';
import { ShaderOptions } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code';
/** Defines the perspective shadow camera params. */
export type PerspectiveShadowCameraParams = Omit<PerspectiveProjectionParams, 'fov' | 'aspect'>;
/** Defines the perspective shadow camera. */
export interface PerspectiveShadowCamera extends PerspectiveShadowCameraParams {
    /** @ignore */
    _near: number;
    /** @ignore */
    _far: number;
    /** Perspective camera projection {@link Mat4}. */
    projectionMatrix: Mat4;
    /** Array of 6 view {@link Mat4} corresponding to each faces of a cube. */
    viewMatrices: Mat4[];
}
/**
 * Base parameters used to create a {@link PointShadow}.
 */
export interface PointShadowParams extends ShadowBaseParams {
    /** {@link PointLight} used to create the {@link PointShadow}. */
    light: PointLight;
    /** {@link PerspectiveShadowCameraParams | Perspective projection parameters} to use. */
    camera?: PerspectiveShadowCameraParams;
}
/** @ignore */
export declare const pointShadowStruct: Record<string, Input>;
/**
 * Create a shadow map from a {@link PointLight} by rendering to a depth cube texture using an array of view {@link Mat4} based on the {@link PointLight} position and a {@link PerspectiveShadowCamera | perspective shadow camera} {@link Mat4}.
 *
 * This type of shadow is more expensive than {@link core/shadows/DirectionalShadow.DirectionalShadow | DirectionalShadow} since its scene needs to be rendered 6 times to each face of a depth cube texture instead of once.
 */
export declare class PointShadow extends Shadow {
    #private;
    /** {@link PointLight} associated with this {@link PointShadow}. */
    light: PointLight;
    /** {@link PerspectiveShadowCamera | Perspective shadow camera} to use for shadow calculations. */
    camera: PerspectiveShadowCamera;
    /** Options used to create this {@link PointShadow}. */
    options: PointShadowParams;
    /** Array of {@link Vec3} representing each cube face up directions to compute the {@link PointShadow#camera.viewMatrices | camera view matrices}. */
    cubeUps: Vec3[];
    /** Array of {@link Vec3} representing each cube face directions to compute the {@link PointShadow#camera.viewMatrices | camera view matrices}. */
    cubeDirections: Vec3[];
    /**
     * PointShadow constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link PointShadow}.
     * @param parameters - {@link PointShadowParams | parameters} used to create this {@link PointShadow}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera, }?: PointShadowParams);
    /**
     * Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding(): void;
    /**
     * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
     * Called internally by the associated {@link PointLight} if any shadow parameters are specified when creating it. Can also be called directly.
     * @param parameters - parameters to use for this {@link PointShadow}.
     */
    cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, camera }?: Omit<PointShadowParams, "light">): void;
    /**
     * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
     */
    init(): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed.
     */
    reset(): void;
    /**
     * Update the {@link PointShadow#camera.projectionMatrix | camera perspective projection matrix} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    updateProjectionMatrix(): void;
    /**
     * Update the {@link PointShadow#camera.viewMatrices | camera view matrices} and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param position - {@link Vec3} to use as position for the {@link PointShadow#camera.viewMatrices | camera view matrices}, based on the {@link light} position.
     */
    updateViewMatrices(position?: Vec3): void;
    /**
     * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
     */
    setDepthTexture(): void;
    /**
     * Create the cube {@link depthTexture}.
     */
    createDepthTexture(): void;
    /**
     * Clear the content of the depth texture. Called whenever the {@link meshes} array is empty after having removed a mesh.
     */
    clearDepthTexture(): void;
    /**
     * Remove the depth pass from its {@link utils/TasksQueueManager.TasksQueueManager | task queue manager}.
     * @param depthPassTaskID - Task queue manager ID to use for removal.
     */
    removeDepthPass(depthPassTaskID: any): void;
    /**
     * Render the depth pass. This happens before creating the {@link CameraRenderer} command encoder.<br>
     * - For each face of the depth cube texture:
     *   - Create a command encoder.
     *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
     *   - Update the face index.
     *   - Render all the depth meshes.
     *   - Submit the command encoder.
     * @param once - Whether to render it only once or not.
     */
    render(once?: boolean): number;
    /**
     * Get the default depth pass vertex shader for this {@link PointShadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings, geometry }: VertexShaderInputBaseParams): ShaderOptions;
    /**
     * Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
     * @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
     */
    getDefaultShadowDepthFs(): ShaderOptions;
}
