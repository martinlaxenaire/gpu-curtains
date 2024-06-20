/// <reference types="dist" />
import { GPURenderer } from './GPURenderer';
import { GPUCameraRenderer } from './GPUCameraRenderer';
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../../curtains/GPUCurtains';
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
 * @returns - the {@link Renderer} if correctly set
 */
export declare const isRenderer: (renderer: GPUCurtains | Renderer | undefined, type: string | null) => Renderer;
/**
 * Check if the given renderer is a {@link CameraRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link CameraRenderer} if correctly set
 */
export declare const isCameraRenderer: (renderer: GPUCurtains | CameraRenderer | undefined, type: string | null) => CameraRenderer;
/**
 * Check if the given renderer is a {@link GPUCurtainsRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link GPUCurtainsRenderer} if correctly set
 */
export declare const isCurtainsRenderer: (renderer: GPUCurtains | GPUCurtainsRenderer | undefined, type: string | null) => GPUCurtainsRenderer;
/**
 * Helper to generate mips on the GPU
 * Taken from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
 */
export declare const generateMips: (device: GPUDevice, texture: GPUTexture) => void;
