/// <reference types="dist" />
import { GPURenderer, GPURendererParams, SceneObject } from './GPURenderer';
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera';
import { BufferBinding } from '../bindings/BufferBinding';
import { BindGroup } from '../bindGroups/BindGroup';
import { Vec3 } from '../../math/Vec3';
import { AllowedBindGroups, Input } from '../../types/BindGroups';
import { RectBBox } from '../DOM/DOMElement';
import type { Light, LightsType, ShadowCastingLights } from '../lights/Light';
import { WGSLVariableType } from '../bindings/utils';
import { ShadowsType } from '../shadows/Shadow';
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
}
/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
    /** An object defining {@link CameraBasePerspectiveOptions | camera perspective parameters} */
    camera?: CameraBasePerspectiveOptions;
    /** An object defining {@link GPUCameraRendererLightParams | the maximum number of light} to use when creating the {@link GPUCameraRenderer}. */
    lights?: GPUCameraRendererLightParams;
}
/**
 * This renderer is meant to render meshes projected by a {@link Camera}. It therefore creates a {@link Camera} with its associated {@link bindings} as well as lights and shadows {@link bindings} used for lighting and their associated {@link cameraLightsBindGroup | bind group}.<br>
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
 */
export declare class GPUCameraRenderer extends GPURenderer {
    #private;
    /** {@link Camera} used by this {@link GPUCameraRenderer}. */
    camera: Camera;
    /** {@link BindGroup | bind group} handling the camera, lights and shadows {@link BufferBinding}. */
    cameraLightsBindGroup: BindGroup;
    /** Array of all the created {@link Light}. */
    lights: Light[];
    /** An object defining the current {@link LightsBindingParams | lights binding parameters}, including the maximum number of lights for each type and the structure used to create the associated {@link BufferBinding}. */
    lightsBindingParams: LightsBindingParams;
    /** An object defining the structure used to create the shadows {@link BufferBinding}. */
    shadowsBindingsStruct: Record<string, Record<string, Input>>;
    /** The bindings used by the {@link cameraLightsBindGroup | camera, lights and shadows bind group}. */
    bindings: GPUCameraRendererBindings;
    /** Options used to create this {@link GPUCameraRenderer}. */
    options: GPUCameraRendererParams;
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({ deviceManager, label, container, pixelRatio, autoResize, preferredFormat, alphaMode, renderPass, camera, lights, }: GPUCameraRendererParams);
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
     * @async
     */
    restoreContext(): void;
    /**
     * Set the {@link camera}
     * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
     */
    setCamera(cameraParameters: CameraBasePerspectiveOptions): void;
    /**
     * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link GPUCameraRenderer#bindings.camera | camera binding} inputs view values and the {@link meshes} {@link Camera} object.
     * @param camera - new {@link Camera} to use.
     */
    useCamera(camera: Camera): void;
    /**
     * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
     */
    onCameraMatricesChanged(): void;
    /**
     * Set the {@link GPUCameraRenderer#bindings.camera | camera buffer binding} and {@link cameraLightsBindGroup | camera bind group}
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
     */
    onMaxLightOverflow(lightsType: LightsType): void;
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
    setCameraBindGroup(): void;
    /**
     * Tell our  {@link cameraLightsBindGroup | camera, lights and shadows bind group} to update.
     */
    shouldUpdateCameraLightsBindGroup(): void;
    /**
     * Tell our {@link GPUCameraRenderer#bindings.camera | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
     */
    updateCameraBindings(): void;
    /**
     * Get all objects ({@link core/renderers/GPURenderer.RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[];
    /**
     * Set our {@link camera} perspective matrix new parameters (fov, near plane and far plane)
     * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({ fov, near, far }?: CameraBasePerspectiveOptions): void;
    /**
     * Set our {@link camera} {@link Camera#position | position}
     * @param position - new {@link Camera#position | position}
     */
    setCameraPosition(position?: Vec3): void;
    /**
     * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    resize(rectBBox?: RectBBox | null): void;
    /**
     * {@link setCameraBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder: GPUCommandEncoder): void;
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy(): void;
}
