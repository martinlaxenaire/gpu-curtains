/// <reference types="dist" />
import { CameraRenderer } from '../renderers/utils';
import { Vec2 } from '../../math/Vec2';
import { Mat4 } from '../../math/Mat4';
import { Texture } from '../textures/Texture';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { Sampler } from '../samplers/Sampler';
import { ProjectedMesh } from '../renderers/GPURenderer';
import { DirectionalLight } from '../lights/DirectionalLight';
import { PointLight } from '../lights/PointLight';
import { BufferBinding } from '../bindings/BufferBinding';
import { RenderMaterialParams, ShaderOptions } from '../../types/Materials';
import { Input } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { VertexShaderInputBaseParams } from '../shaders/full/vertex/get-vertex-shader-code';
import { Geometry } from '../geometries/Geometry';
/** Defines all types of shadows. */
export type ShadowsType = 'directionalShadows' | 'pointShadows';
/** @ignore */
export declare const shadowStruct: Record<string, Input>;
/**
 * Base parameters used to create a {@link Shadow}.
 */
export interface ShadowBaseParams {
    /** Intensity of the shadow in the [0, 1] range. Default to `1`. */
    intensity?: number;
    /** Shadow map bias. Default to `0`. */
    bias?: number;
    /** Shadow map normal bias. Default to `0`. */
    normalBias?: number;
    /** Number of samples to use for Percentage Closer Filtering calculations in the shader. Increase for smoother shadows, at the cost of performance. Default to `1`. */
    pcfSamples?: number;
    /** Size of the depth {@link Texture} to use. Default to `Vec2(512)`. */
    depthTextureSize?: Vec2;
    /** Format of the  depth {@link Texture} to use. Default to `depth24plus`. */
    depthTextureFormat?: GPUTextureFormat;
    /** Whether the shadow should be automatically rendered each frame or not. Should be set to `false` if the scene is static and be rendered manually instead. Default to `true`. */
    autoRender?: boolean;
    /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
    light: DirectionalLight | PointLight;
}
/**
 * Used as a base class to create a shadow map.
 *
 * A {@link Shadow} creates a {@link depthTexture | depth Texture} (that can vary based on the light type) and a {@link depthComparisonSampler | depth comparison Sampler}.
 *
 * Each {@link ProjectedMesh | Mesh} added to the {@link Shadow} will be rendered beforehand to the {@link depthTexture} using a {@link depthPassTarget | RenderTarget} and a custom {@link RenderMaterial}.
 */
export declare class Shadow {
    #private;
    /** The {@link CameraRenderer} used to create this {@link Shadow}. */
    renderer: CameraRenderer;
    /** Index of this {@link Shadow} used in the corresponding {@link CameraRenderer} shadow buffer binding. */
    index: number;
    /** The {@link core/lights/Light.Light | light} that will be used to cast shadows. */
    light: DirectionalLight | PointLight;
    /** Options used to create this {@link Shadow}. */
    options: Omit<ShadowBaseParams, 'autoRender'>;
    /** Sample count of the {@link depthTexture}. Only `1` is accepted for now. */
    sampleCount: number;
    /** Size of the depth {@link Texture} to use. Default to `Vec2(512)`. */
    depthTextureSize: Vec2;
    /** Format of the  depth {@link Texture} to use. Default to `depth24plus`. */
    depthTextureFormat: GPUTextureFormat;
    /** Depth {@link Texture} used to create the shadow map. */
    depthTexture: null | Texture;
    /** Depth {@link RenderTarget} onto which the {@link meshes} will be rendered. */
    depthPassTarget: null | RenderTarget;
    /** Depth comparison {@link Sampler} used to compare depth in the shaders. */
    depthComparisonSampler: null | Sampler;
    /** Map of all the parent {@link ProjectedMesh | meshes} used to create the depth meshes. */
    meshes: Map<ProjectedMesh['uuid'], ProjectedMesh>;
    /** {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} that holds all the bindings for this type of shadow to send to the shaders. */
    rendererBinding: BufferBinding | null;
    /**
     * Shadow constructor
     * @param renderer - {@link CameraRenderer} used to create this {@link Shadow}.
     * @param parameters - {@link ShadowBaseParams | parameters} used to create this {@link Shadow}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, { light, intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender, }?: ShadowBaseParams);
    /**
     * Set or reset this shadow {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: CameraRenderer | GPUCurtains): void;
    /** @ignore */
    setRendererBinding(): void;
    /**
     * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
     * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
     * @param parameters - parameters to use for this {@link Shadow}.
     */
    cast({ intensity, bias, normalBias, pcfSamples, depthTextureSize, depthTextureFormat, autoRender }?: Omit<ShadowBaseParams, "light">): void;
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed.
     */
    reset(): void;
    /**
     * Get whether this {@link Shadow} is actually casting shadows.
     * @returns - Whether this {@link Shadow} is actually casting shadows.
     */
    get isActive(): boolean;
    /**
     * Start or stop casting shadows.
     * @param value - New active state.
     */
    set isActive(value: boolean);
    /**
     * Get this {@link Shadow} intensity.
     * @returns - The {@link Shadow} intensity.
     */
    get intensity(): number;
    /**
     * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} intensity.
     */
    set intensity(value: number);
    /**
     * Get this {@link Shadow} bias.
     * @returns - The {@link Shadow} bias.
     */
    get bias(): number;
    /**
     * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} bias.
     */
    set bias(value: number);
    /**
     * Get this {@link Shadow} normal bias.
     * @returns - The {@link Shadow} normal bias.
     */
    get normalBias(): number;
    /**
     * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} normal bias.
     */
    set normalBias(value: number);
    /**
     * Get this {@link Shadow} PCF samples count.
     * @returns - The {@link Shadow} PCF samples count.
     */
    get pcfSamples(): number;
    /**
     * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} PCF samples count.
     */
    set pcfSamples(value: number);
    /**
     * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget} and start rendering to the shadow map.
     */
    init(): void;
    /**
     * Reset the {@link depthTexture} when the {@link depthTextureSize} changes.
     */
    onDepthTextureSizeChanged(): void;
    /**
     * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
     */
    setDepthTexture(): void;
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture(): void;
    /**
     * Clear the content of the depth texture. Called whenever the {@link meshes} array is empty after having removed a mesh.
     */
    clearDepthTexture(): void;
    /**
     * Create the {@link depthPassTarget}.
     */
    createDepthPassTarget(): void;
    /**
     * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
     * @param propertyKey - name of the property to update.
     * @param value - new value of the property.
     */
    onPropertyChanged(propertyKey: string, value: Mat4 | number): void;
    /**
     * Start the depth pass.
     */
    setDepthPass(): void;
    /**
     * Remove the depth pass from its {@link utils/TasksQueueManager.TasksQueueManager | task queue manager}.
     * @param depthPassTaskID - Task queue manager ID to use for removal.
     */
    removeDepthPass(depthPassTaskID: any): void;
    /**
     * Render the depth pass. This happens before rendering the {@link CameraRenderer#scene | scene}.<br>
     * - Render all the depth meshes.
     * @param once - Whether to render it only once or not.
     */
    render(once?: boolean): number;
    /**
     * Render the shadow map only once. Useful with static scenes if autoRender has been set to `false` to only take one snapshot of the shadow map.
     */
    renderOnce(): Promise<void>;
    /**
     * Render all the {@link meshes} into the {@link depthPassTarget}.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     */
    renderDepthPass(commandEncoder: GPUCommandEncoder): void;
    /**
     * Get the default depth pass vertex shader for this {@link Shadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings, geometry }: VertexShaderInputBaseParams): ShaderOptions;
    /**
     * Get the default depth pass fragment shader for this {@link Shadow}.
     * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
     */
    getDefaultShadowDepthFs(): false | ShaderOptions;
    /**
     * Patch the given {@link ProjectedMesh | mesh} material parameters to create the depth mesh.
     * @param mesh - original {@link ProjectedMesh | mesh} to use.
     * @param parameters - Optional additional parameters to use for the depth mesh.
     * @returns - Patched parameters.
     */
    patchShadowCastingMeshParams(mesh: ProjectedMesh, parameters?: RenderMaterialParams): RenderMaterialParams;
    /**
     * Add a {@link ProjectedMesh | mesh} to the shadow map. Internally called by the {@link ProjectedMesh | mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
     * - {@link patchShadowCastingMeshParams | Patch} the parameters.
     * - Create a new depth {@link Mesh} with the patched parameters.
     * - Add the {@link ProjectedMesh | mesh} to the {@link meshes} Map.
     * @param mesh - {@link ProjectedMesh | mesh} to add to the shadow map.
     * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth mesh.
     */
    addShadowCastingMesh(mesh: ProjectedMesh, parameters?: RenderMaterialParams): void;
    /**
     * Remove a {@link ProjectedMesh | mesh} from the shadow map and destroy its depth mesh.
     * @param mesh - {@link ProjectedMesh | mesh} to remove.
     */
    removeMesh(mesh: ProjectedMesh): void;
    /**
     * If one of the {@link meshes} had its geometry change, update the corresponding depth mesh geometry as well.
     * @param mesh - Original {@link ProjectedMesh} which geometry just changed.
     * @param geometry - New {@link ProjectedMesh} {@link Geometry} to use.
     */
    updateMeshGeometry(mesh: ProjectedMesh, geometry: Geometry): void;
    /**
     * Destroy the {@link Shadow}.
     */
    destroy(): void;
}
