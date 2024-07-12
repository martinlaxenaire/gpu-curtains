/// <reference types="dist" />
import { GPURenderer, GPURendererParams, SceneObject } from './GPURenderer';
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera';
import { BufferBinding } from '../bindings/BufferBinding';
import { BindGroup } from '../bindGroups/BindGroup';
import { Vec3 } from '../../math/Vec3';
import { AllowedBindGroups, Input } from '../../types/BindGroups';
import { RectBBox } from '../DOM/DOMElement';
import { Light, LightsType, ShadowCastingLights } from '../lights/Light';
import { WGSLVariableType } from '../bindings/utils';
import { ShadowsType } from '../shadows/Shadow';
export interface LightParams {
    max: number;
    label: string;
    params: Record<string, {
        type: WGSLVariableType;
        size: number;
    }>;
}
export type LightsBindingParams = Record<LightsType, LightParams>;
export type GPUCameraRendererBindings = Record<'camera' | LightsType | ShadowsType, BufferBinding>;
export interface GPUCameraRendererLightParams {
    maxAmbientLights?: LightsBindingParams['ambientLights']['max'];
    maxDirectionalLights?: LightsBindingParams['directionalLights']['max'];
    maxPointLights?: LightsBindingParams['pointLights']['max'];
}
/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
    /** An object defining {@link CameraBasePerspectiveOptions | camera perspective parameters} */
    camera?: CameraBasePerspectiveOptions;
    lights?: GPUCameraRendererLightParams;
}
/**
 * This renderer also creates a {@link Camera} and its associated {@link bindings} and {@link cameraLightsBindGroup | bind group}.<br>
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
    /** {@link Camera} used by this {@link GPUCameraRenderer} */
    camera: Camera;
    /** {@link BindGroup | bind group} handling the {@link cameraBinding | camera buffer binding} */
    cameraLightsBindGroup: BindGroup;
    lights: Light[];
    lightsBindingParams: LightsBindingParams;
    shadowsBindingsStruct: Record<string, Record<string, Input>>;
    bindings: GPUCameraRendererBindings;
    /** Options used to create this {@link GPUCameraRenderer} */
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
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBinding | camera buffer binding}.
     * @async
     */
    restoreContext(): void;
    /**
     * Set the {@link camera}
     * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
     */
    setCamera(cameraParameters: CameraBasePerspectiveOptions): void;
    /**
     * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link cameraBinding} inputs view values and the {@link meshes} {@link Camera} object.
     * @param camera - new {@link Camera} to use.
     */
    useCamera(camera: Camera): void;
    /**
     * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
     */
    onCameraMatricesChanged(): void;
    /**
     * Set the {@link cameraBinding | camera buffer binding} and {@link cameraLightsBindGroup | camera bind group}
     */
    setCameraBinding(): void;
    addLight(light: Light): void;
    removeLight(light: Light): void;
    setLightsBinding(): void;
    setLightsTypeBinding(lightsType: LightsType): void;
    onMaxLightOverflow(lightsType: LightsType): void;
    get shadowCastingLights(): ShadowCastingLights[];
    setShadowsBinding(): void;
    setShadowsTypeBinding(lightsType: LightsType): void;
    setCameraLightsBindGroup(): void;
    /**
     * Create the {@link cameraLightsBindGroup | camera and lights bind group} buffers
     */
    setCameraBindGroup(): void;
    shouldUpdateCameraLightsBindGroup(): void;
    /**
     * Tell our {@link cameraBinding | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
     */
    updateCameraBindings(): void;
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
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
