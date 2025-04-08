import { GPURenderer, ProjectedMesh } from './GPURenderer';
import { GPUCameraRenderer } from './GPUCameraRenderer';
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * A Renderer could be either a {@link GPURenderer}, a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}.
 */
export type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer;
/**
 * A CameraRenderer could be either a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}.
 */
export type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer;
/**
 * Check if the given renderer is a {@link Renderer}.
 * @param renderer - Renderer to test.
 * @param type - Object type used to format the error if needed.
 * @returns - The {@link Renderer} if correctly set.
 */
export declare const isRenderer: (renderer: GPUCurtains | Renderer | undefined, type: string | null) => Renderer;
/**
 * Check if the given renderer is a {@link CameraRenderer}.
 * @param renderer - Renderer to test.
 * @param type - Object type used to format the error if needed.
 * @returns - The {@link CameraRenderer} if correctly set.
 */
export declare const isCameraRenderer: (renderer: GPUCurtains | CameraRenderer | undefined, type: string | null) => CameraRenderer;
/**
 * Check if the given renderer is a {@link GPUCurtainsRenderer}.
 * @param renderer - Renderer to test.
 * @param type - Object type used to format the error if needed.
 * @returns - The {@link GPUCurtainsRenderer} if correctly set.
 */
export declare const isCurtainsRenderer: (renderer: GPUCurtains | GPUCurtainsRenderer | undefined, type: string | null) => GPUCurtainsRenderer;
/**
 * Check if a given object is a {@link ProjectedMesh | projected mesh}.
 * @param object - Object to test.
 * @returns - Given object as a {@link ProjectedMesh | projected mesh} if the test is successful, `false` otherwise.
 */
export declare const isProjectedMesh: (object: object) => false | ProjectedMesh;
