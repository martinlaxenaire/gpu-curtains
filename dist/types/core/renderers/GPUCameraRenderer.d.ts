/// <reference types="@webgpu/types" />
import { GPURenderer, GPURendererOptions, GPURendererParams, SceneObject } from './GPURenderer';
import { Camera } from '../cameras/Camera';
import { PerspectiveCamera, PerspectiveCameraBaseOptions } from '../cameras/PerspectiveCamera';
import { BufferBinding } from '../bindings/BufferBinding';
import { BindGroup } from '../bindGroups/BindGroup';
import { AllowedBindGroups, Input } from '../../types/BindGroups';
import { RectBBox } from '../DOM/DOMElement';
import type { Light, LightsType, ShadowCastingLights } from '../lights/Light';
import { WGSLVariableType } from '../bindings/utils';
import { ShadowsType } from '../shadows/Shadow';
import { Texture } from '../textures/Texture';
import { Sampler } from '../samplers/Sampler';
import { RenderPassEntry } from '../scenes/Scene';
import { OrthographicCamera } from '../cameras/OrthographicCamera';
import { RenderPassViewport } from '../renderPasses/RenderPass';
/** Defines the allowed {@link Camera} types for a {@link GPUCameraRenderer}. */
export type RendererCamera = OrthographicCamera | PerspectiveCamera;
/** Defines the parameters used to build the {@link BufferBinding} of each type of lights. */
export interface LightParams {
    /** Maximum number for a given type of light. */
    max: number;
    /** Label for a given type of light. */
    label: string;
    /** Parameters to use to build the {@link BufferBinding} for a given type of light. */
    params: Record<string, {
        /** WGSL type of the input. */
        type: WGSLVariableType;
        /** Size of the input. */
        size: number;
    }>;
}
/** Defines the {@link BufferBinding} parameters for all kinds of {@link LightsType | light types}. */
export type LightsBindingParams = Record<LightsType, LightParams>;
/** Defines all the possible {@link BufferBinding} to use in the {@link GPUCameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows bind group}. */
export type GPUCameraRendererBindings = Record<'camera' | LightsType | ShadowsType, BufferBinding>;
/**
 * Base parameters for the maximum number of lights to use when creating a {@link GPUCameraRenderer}.
 */
export interface GPUCameraRendererLightParams {
    /** Maximum number of {@link core/lights/AmbientLight.AmbientLight | AmbientLight} to use. Default to `2`. */
    maxAmbientLights?: LightsBindingParams['ambientLights']['max'];
    /** Maximum number of {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} to use. Default to `5`. */
    maxDirectionalLights?: LightsBindingParams['directionalLights']['max'];
    /** Maximum number of {@link core/lights/PointLight.PointLight | PointLight} to use. Default to `5`. */
    maxPointLights?: LightsBindingParams['pointLights']['max'];
    /** Maximum number of {@link core/lights/SpotLight.SpotLight | SpotLight} to use. Default to `5`. */
    maxSpotLights?: LightsBindingParams['spotLights']['max'];
    /** Whether to use `uniform` instead of `storage` binding type for the shadows bindings. In some case, for example when using models with skinning or morph targets, the maximum number of `storage` bindings can be reached in the vertex shader. This allows to bypass this limit by switching the shadows binding from `storage` to `uniforms`, but restrict the flexibility by removing the ability to overflow lights. Default to `false`. */
    useUniformsForShadows?: boolean;
}
/** Extra parameters used to define the {@link RendererCamera} and various lights options. */
export interface GPUCameraLightsRendererParams {
    /** An object defining {@link PerspectiveCameraBaseOptions | camera perspective parameters} */
    camera?: PerspectiveCameraBaseOptions;
    /** An object defining {@link GPUCameraRendererLightParams | the maximum number of light} to use when creating the {@link GPUCameraRenderer}. Can be set to `false` to avoid creating lights and shadows buffers. */
    lights?: GPUCameraRendererLightParams | false;
}
/** Parameters used to create a {@link GPUCameraRenderer}. */
export interface GPUCameraRendererParams extends GPURendererParams, GPUCameraLightsRendererParams {
}
/** Options used to create a {@link GPUCameraRenderer}. */
export interface GPUCameraRendererOptions extends GPURendererOptions, GPUCameraLightsRendererParams {
}
/**
 * This renderer is meant to render meshes projected by a {@link RendererCamera}. It therefore creates a {@link RendererCamera} with its associated {@link bindings} as well as lights and shadows {@link bindings} used for lighting and their associated {@link cameraLightsBindGroup | bind group}.<br>
 * Can be safely used to render compute passes and meshes if they do not need to be tied to the DOM.
 *
 * @example
 * ```javascript
 * // first, we need a WebGPU device, that's what GPUDeviceManager is for
 * const gpuDeviceManager = new GPUDeviceManager({
 *   label: 'Custom device manager',
 * })
 *
 * // we need to wait for the WebGPU device to be created
 * await gpuDeviceManager.init()
 *
 * // then we can create a camera renderer
 * const gpuCameraRenderer = new GPUCameraRenderer({
 *   deviceManager: gpuDeviceManager, // we need the WebGPU device to create the renderer context
 *   container: document.querySelector('#canvas'),
 * })
 * ```
 * @template TCamera - The camera type parameter which extends {@link RendererCamera}. Default is {@link PerspectiveCamera}.
 */
export declare class GPUCameraRenderer<TCamera extends RendererCamera = PerspectiveCamera> extends GPURenderer {
    #private;
    /** {@link RendererCamera} used by this {@link GPUCameraRenderer}. Default to a {@link PerspectiveCamera}. */
    camera: TCamera;
    /** {@link BindGroup | bind group} handling the camera, lights and shadows {@link BufferBinding}. */
    cameraLightsBindGroup: BindGroup;
    /** Additional {@link RenderPassViewport} from the {@link RendererCamera} to use if any. Will be contained inside the {@link viewport} if any. */
    cameraViewport: RenderPassViewport | null;
    /** Array of all the created {@link Light}. */
    lights: Light[];
    /** An object defining the current {@link LightsBindingParams | lights binding parameters}, including the maximum number of lights for each type and the structure used to create the associated {@link BufferBinding}. */
    lightsBindingParams: LightsBindingParams;
    /** An object defining the structure used to create the shadows {@link BufferBinding}. */
    shadowsBindingsStruct: Record<string, Record<string, Input>>;
    /** The bindings used by the {@link cameraLightsBindGroup | camera, lights and shadows bind group}. */
    bindings: GPUCameraRendererBindings;
    /** An array of {@link BindGroup} containing a single {@link BufferBinding} with the cube face index onto which we'll want to draw for {@link core/shadows/PointShadow.PointShadow | PointShadow} depth cube map. Will be swapped for each face render passes by the {@link core/shadows/PointShadow.PointShadow | PointShadow}. */
    pointShadowsCubeFaceBindGroups: BindGroup[];
    /** Options used to create this {@link GPUCameraRenderer}. */
    options: GPUCameraRendererOptions;
    /** If our scene contains transmissive objects, we need to handle the rendering of transmissive meshes. To do so, we'll need a new screen pass {@link RenderPassEntry} and a {@link Texture} onto which we'll write the content of the non transmissive objects main buffer rendered objects. */
    transmissionTarget: {
        /** The new screen pass {@link RenderPassEntry} where we'll draw our transmissive objects. */
        passEntry?: RenderPassEntry;
        /** The {@link Texture} holding the content of all the non transmissive objects we've already drawn onto the main screen buffer. */
        texture?: Texture;
        /** The {@link Sampler} used to sample the background output texture. */
        sampler: Sampler;
    };
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({ deviceManager, label, container, pixelRatio, autoResize, context, renderPass, camera, lights, }: GPUCameraRendererParams);
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
     */
    restoreContext(): void;
    /**
     * Set our {@link renderPass | main render pass} and our {@link transmissionTarget} sampler.
     */
    setMainRenderPasses(): void;
    /**
     * Set the default {@link camera}.
     * @param cameraParameters - {@link PerspectiveCameraBaseOptions | parameters} used to create the {@link camera}.
     */
    setCamera(cameraParameters: PerspectiveCameraBaseOptions): void;
    /**
     * Tell our {@link GPUCameraRenderer} to use this {@link RendererCamera}. If a {@link RendererCamera | camera} has already been set, reset the {@link GPUCameraRenderer#bindings.camera | camera binding} inputs view values and the {@link meshes} {@link RendererCamera} object.
     * @param camera - New {@link RendererCamera} to use.
     * @returns - This {@link GPUCameraRenderer} with its {@link RendererCamera | camera} type updated.
     */
    useCamera<NewCamera extends RendererCamera>(camera: NewCamera): GPUCameraRenderer<NewCamera>;
    /**
     * Update the {@link cameraViewport} if needed (i.e. if the camera use a different aspect ratio than the renderer).
     */
    updateCameraViewport(): void;
    /**
     * Resize the {@link camera}, first by updating the {@link cameraViewport} and then resetting the {@link camera} projection.
     */
    resizeCamera(): void;
    /**
     * Set the {@link cameraViewport} (that should be contained within the renderer {@link GPURenderer#viewport | viewport} if any) and update the {@link renderPass} and {@link postProcessingPass} {@link GPURenderer#viewport | viewport} values.
     * @param viewport - {@link RenderPassViewport} settings to use if any.
     */
    setCameraViewport(viewport?: RenderPassViewport | null): void;
    /**
     * Resize the {@link camera} whenever the {@link GPURenderer#viewport | viewport} is updated.
     * @param viewport - {@link RenderPassViewport} settings to use if any. Can be set to `null` to cancel the {@link GPURenderer#viewport | viewport}.
     */
    setViewport(viewport?: RenderPassViewport | null): void;
    /**
     * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes.
     */
    onCameraMatricesChanged(): void;
    /**
     * Create a {@link BufferBinding} from a given {@link Camera}. Used internally but can also be used to create a new {@link BufferBinding} from a different camera than this renderer's {@link RendererCamera | camera}.
     * @param camera - {@link Camera} to use to create the {@link BufferBinding}.
     * @param label - Optional label to use for the {@link BufferBinding}.
     * @returns - Newly created {@link BufferBinding}.
     */
    createCameraBinding(camera: Camera, label?: string): BufferBinding;
    /**
     * Set the {@link GPUCameraRenderer#bindings.camera | camera BufferBinding}.
     */
    setCameraBinding(): void;
    /**
     * Add a {@link Light} to the {@link lights} array.
     * @param light - {@link Light} to add.
     */
    addLight(light: Light): void;
    /**
     * Remove a {@link Light} from the {@link lights} array.
     * @param light - {@link Light} to remove.
     */
    removeLight(light: Light): void;
    /**
     * Set the lights {@link BufferBinding} based on the {@link lightsBindingParams}.
     */
    setLightsBinding(): void;
    /**
     * Set or reset the {@link BufferBinding} for a given {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} for which to create the {@link BufferBinding}.
     */
    setLightsTypeBinding(lightsType: LightsType): void;
    /**
     * Called when a {@link LightsType | type of light} has overflown its maximum capacity. Destroys the associated {@link BufferBinding} (and eventually the associated shadow {@link BufferBinding}), recreates the {@link cameraLightsBindGroup | camera, lights and shadows bind group} and reset all lights for this {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} that has overflown its maximum capacity.
     * @param lightIndex - The {@link Light#index | light index} that caused overflow. Will be used to reset the new max light count.
     */
    onMaxLightOverflow(lightsType: LightsType, lightIndex?: number): void;
    /**
     * Get all the current {@link ShadowCastingLights | lights that can cast shadows}.
     * @returns - All {@link ShadowCastingLights | lights that can cast shadows}.
     */
    get shadowCastingLights(): ShadowCastingLights[];
    /**
     * Set the shadows {@link BufferBinding} based on the {@link shadowsBindingsStruct}.
     */
    setShadowsBinding(): void;
    /**
     * Set or reset the associated shadow {@link BufferBinding} for a given {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} for which to create the associated shadow {@link BufferBinding}.
     */
    setShadowsTypeBinding(lightsType: LightsType): void;
    /**
     * Set the {@link cameraLightsBindGroup | camera, lights and shadows bind group}.
     */
    setCameraLightsBindGroup(): void;
    /**
     * Create the {@link cameraLightsBindGroup | camera, lights and shadows bind group} buffers
     */
    createCameraLightsBindGroup(): void;
    /**
     * Tell our  {@link cameraLightsBindGroup | camera, lights and shadows bind group} to update.
     */
    shouldUpdateCameraLightsBindGroup(): void;
    /**
     * Tell our {@link GPUCameraRenderer#bindings.camera | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
     */
    updateCameraBindings(): void;
    /**
     * Update the {@link cameraLightsBindGroup | camera and lights BindGroup}.
     */
    updateCameraLightsBindGroup(): void;
    /**
     * Get all objects ({@link core/renderers/GPURenderer.RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[];
    /**
     * Create the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if not already created.
     */
    createTransmissionTarget(): void;
    /**
     * Destroy the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if already created.
     */
    destroyTransmissionTarget(): void;
    /**
     * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    resize(rectBBox?: RectBBox | null): void;
    /**
     * {@link createCameraLightsBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     */
    render(commandEncoder: GPUCommandEncoder): void;
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy(): void;
}
