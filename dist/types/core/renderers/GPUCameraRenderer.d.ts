/// <reference types="dist" />
import { GPURenderer, GPURendererParams, MeshType } from './GPURenderer';
import { Camera, CameraBasePerspectiveOptions } from '../camera/Camera';
import { BufferBinding } from '../bindings/BufferBinding';
import { BindGroup } from '../bindGroups/BindGroup';
import { Vec3 } from '../../math/Vec3';
/**
 * Parameters used to create a {@link GPUCameraRenderer}
 */
export interface GPUCameraRendererParams extends GPURendererParams {
    /** An object defining [camera perspective parameters]{@link CameraBasePerspectiveOptions} */
    camera: CameraBasePerspectiveOptions;
}
/**
 * GPUCameraRenderer class:
 * This renderer also creates a {@link Camera} and its associated [struct]{@link GPUCameraRenderer#cameraBufferBinding} and [bind group]{@link GPUCameraRenderer#cameraBindGroup}
 * @extends GPURenderer
 */
export declare class GPUCameraRenderer extends GPURenderer {
    /** {@link Camera} used by this {@link GPUCameraRenderer} */
    camera: Camera;
    /** [struct]{@link BufferBinding} handling the [camera]{@link GPUCameraRenderer#camera} matrices */
    cameraBufferBinding: BufferBinding;
    /** [bind group]{@link BindGroup} handling the [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} */
    cameraBindGroup: BindGroup;
    /**
     * GPUCameraRenderer constructor
     * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCameraRenderer}
     */
    constructor({ deviceManager, container, pixelRatio, sampleCount, preferredFormat, production, alphaMode, camera, onError, onContextLost, }: GPUCameraRendererParams);
    /**
     * Called when the [renderer device]{@link GPURenderer#device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} should be restored.
     * Reset the adapter, device and configure context again, reset our samplers, restore our scene objects context, resize the render textures, re-write our camera buffer binding.
     * @async
     */
    restoreContext(): Promise<void>;
    /**
     * Set the [camera]{@link GPUCameraRenderer#camera}
     * @param cameraParameters - [parameters]{@link CameraBasePerspectiveOptions} used to create the [camera]{@link GPUCameraRenderer#camera}
     */
    setCamera(cameraParameters: CameraBasePerspectiveOptions): void;
    /**
     * Update the [projected meshes]{@link MeshTransformedBaseClass} sizes and positions when the [camera]{@link GPUCurtainsRenderer#camera} [position]{@link Camera#position} changes
     */
    onCameraMatricesChanged(): void;
    /**
     * Set the [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} and [camera bind group]{@link GPUCameraRenderer#cameraBindGroup}
     */
    setCameraBufferBinding(): void;
    /**
     * Create the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} buffers
     */
    setCameraBindGroup(): void;
    /**
     * Tell our [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} that we should update its struct
     */
    updateCameraBindings(): void;
    /**
     * Set our [camera]{@link GPUCameraRenderer#camera} perspective matrix new parameters (fov, near plane and far plane)
     * @param fov - new [field of view]{@link Camera#fov}
     * @param near - new [near plane]{@link Camera#near}
     * @param far - new [far plane]{@link Camera#far}
     */
    setPerspective(fov?: number, near?: number, far?: number): void;
    /**
     * Set our [camera]{@link GPUCameraRenderer#camera} position
     * @param position - new [position]{@link Camera#position}
     */
    setCameraPosition(position?: Vec3): void;
    /**
     * Call our [super onResize method]{@link GPURenderer#onResize} and resize our [camera]{@link GPUCameraRenderer#camera} as well
     */
    onResize(): void;
    /**
     * Update the camera model matrix, check if the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} should be created, create it if needed and then update it
     */
    updateCamera(): void;
    /**
     * Render a single [Mesh]{@link MeshType} (binds the camera bind group if needed)
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - [Mesh]{@link MeshType} to render
     */
    renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: MeshType): void;
    /**
     * [Update the camera]{@link GPUCameraRenderer#updateCamera} and then call our [super render method]{@link GPURenderer#render}
     */
    render(): void;
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy(): void;
}
