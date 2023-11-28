/// <reference types="dist" />
import { GPURenderer } from './GPURenderer';
import { GPUCameraRenderer } from './GPUCameraRenderer';
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer';
/**
 * A Renderer could be either a {@link GPURenderer}, a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {Renderer}
 */
export type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer;
/**
 * A CameraRenderer could be either a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {CameraRenderer}
 */
export type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer;
/**
 * Check if the given renderer is a {@link Renderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - whether the given renderer is a {@link Renderer}
 */
export declare const isRenderer: (renderer: Renderer | undefined, type: string | null) => boolean;
/**
 * Check if the given renderer is a {@link CameraRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - whether the given renderer is a {@link CameraRenderer}
 */
export declare const isCameraRenderer: (renderer: CameraRenderer | undefined, type: string | null) => boolean;
/**
 * Check if the given renderer is a {@link GPUCurtainsRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - whether the given renderer is a {@link GPUCurtainsRenderer}
 */
export declare const isCurtainsRenderer: (renderer: GPUCurtainsRenderer | undefined, type: string | null) => boolean;
/**
 * Helper to generate mips on the GPU
 * Taken from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
 */
export declare const generateMips: (device: GPUDevice, texture: GPUTexture) => void;
