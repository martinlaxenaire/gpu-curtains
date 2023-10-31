/// <reference types="dist" />
import { GPURenderer } from '../core/renderers/GPURenderer';
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer';
import { GPUCurtainsRenderer } from '../curtains/renderers/GPUCurtainsRenderer';
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
export declare const isRenderer: (renderer: Renderer | undefined, type: string | null) => boolean;
export declare const isCameraRenderer: (renderer: CameraRenderer | undefined, type: string | null) => boolean;
export declare const isCurtainsRenderer: (renderer: GPUCurtainsRenderer | undefined, type: string | null) => boolean;
export declare const generateMips: (device: GPUDevice, texture: GPUTexture) => void;
