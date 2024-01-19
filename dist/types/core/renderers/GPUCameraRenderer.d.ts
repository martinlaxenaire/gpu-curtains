/// <reference types="dist" />
import { GPURenderer, GPURendererParams, RenderedMesh, SceneObject } from './GPURenderer';
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera';
import { BufferBinding } from '../bindings/BufferBinding';
import { BindGroup } from '../bindGroups/BindGroup';
import { Vec3 } from '../../math/Vec3';
import { AllowedBindGroups } from '../../types/BindGroups';
/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
    /** An object defining {@link CameraBasePerspectiveOptions | camera perspective parameters} */
    camera: CameraBasePerspectiveOptions;
}
/**
 * This renderer also creates a {@link Camera} and its associated {@link cameraBufferBinding | binding} and {@link cameraBindGroup | bind group}.<br>
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
    /** {@link Camera} used by this {@link GPUCameraRenderer} */
    camera: Camera;
    /** {@link BufferBinding | binding} handling the {@link camera} matrices */
    cameraBufferBinding: BufferBinding;
    /** {@link BindGroup | bind group} handling the {@link cameraBufferBinding | camera buffer binding} */
    cameraBindGroup: BindGroup;
    /** Options used to create this {@link GPUCameraRenderer} */
    options: GPUCameraRendererParams;
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({ deviceManager, container, pixelRatio, preferredFormat, alphaMode, multisampled, renderPass, camera, }: GPUCameraRendererParams);
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} should be restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/RenderTexture.RenderTexture | render textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBufferBinding | camera buffer binding}.
     * @async
     */
    restoreContext(): Promise<void>;
    /**
     * Set the {@link camera}
     * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
     */
    setCamera(cameraParameters: CameraBasePerspectiveOptions): void;
    /**
     * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
     */
    onCameraMatricesChanged(): void;
    /**
     * Set the {@link cameraBufferBinding | camera buffer binding} and {@link cameraBindGroup | camera bind group}
     */
    setCameraBufferBinding(): void;
    /**
     * Create the {@link cameraBindGroup | camera bind group} buffers
     */
    setCameraBindGroup(): void;
    /**
     * Tell our {@link cameraBufferBinding | camera buffer binding} that we should update its struct
     */
    updateCameraBindings(): void;
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraBindGroup | camera bind group}.
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
     * Call our {@link GPURenderer#onResize | GPURenderer onResize method} and resize our {@link camera} as well
     */
    onResize(): void;
    /**
     * Update the camera model matrix, check if the {@link cameraBindGroup | camera bind group} should be created, create it if needed and then update it
     */
    updateCamera(): void;
    /**
     * Render a single {@link RenderedMesh | mesh} (binds the {@link cameraBindGroup | camera bind group} if needed)
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - {@link RenderedMesh | mesh} to render
     */
    renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: RenderedMesh): void;
    /**
     * {@link updateCamera | Update the camera} and then call our {@link GPURenderer#render | GPURenderer render method}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder: GPUCommandEncoder): void;
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy(): void;
}
