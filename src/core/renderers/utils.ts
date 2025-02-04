import { throwError } from '../../utils/utils'
import { GPURenderer, ProjectedMesh } from './GPURenderer'
import { GPUCameraRenderer } from './GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Object3D } from '../objects3D/Object3D'

/**
 * A Renderer could be either a {@link GPURenderer}, a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {Renderer}
 */
export type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer
/**
 * A CameraRenderer could be either a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {CameraRenderer}
 */
export type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer

/**
 * Format a renderer error based on given renderer, renderer type and object type
 * @param renderer - renderer that failed the test
 * @param rendererType - expected renderer type
 * @param type - object type
 */
const formatRendererError = (renderer: Renderer, rendererType = 'GPURenderer', type: string | null): void => {
  const error = type
    ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}`
    : `The ${rendererType} is not defined: ${renderer}`
  throwError(error)
}

/**
 * Check if the given renderer is a {@link Renderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link Renderer} if correctly set
 */
export const isRenderer = (renderer: GPUCurtains | Renderer | undefined, type: string | null): Renderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as Renderer

  const isRenderer =
    renderer &&
    (renderer.type === 'GPURenderer' ||
      renderer.type === 'GPUCameraRenderer' ||
      renderer.type === 'GPUCurtainsRenderer')

  if (!isRenderer) {
    formatRendererError(renderer, 'GPURenderer', type)
  }

  return renderer
}

/**
 * Check if the given renderer is a {@link CameraRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link CameraRenderer} if correctly set
 */
export const isCameraRenderer = (
  renderer: GPUCurtains | CameraRenderer | undefined,
  type: string | null
): CameraRenderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as CameraRenderer

  const isCameraRenderer =
    renderer && (renderer.type === 'GPUCameraRenderer' || renderer.type === 'GPUCurtainsRenderer')

  if (!isCameraRenderer) {
    formatRendererError(renderer, 'GPUCameraRenderer', type)
  }

  return renderer
}

/**
 * Check if the given renderer is a {@link GPUCurtainsRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link GPUCurtainsRenderer} if correctly set
 */
export const isCurtainsRenderer = (
  renderer: GPUCurtains | GPUCurtainsRenderer | undefined,
  type: string | null
): GPUCurtainsRenderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as GPUCurtainsRenderer

  const isCurtainsRenderer = renderer && renderer.type === 'GPUCurtainsRenderer'

  if (!isCurtainsRenderer) {
    formatRendererError(renderer, 'GPUCurtainsRenderer', type)
  }

  return renderer
}

/**
 * Check if a given object is a {@link ProjectedMesh | projected mesh}.
 * @param object - Object to test.
 * @returns - Given object as a {@link ProjectedMesh | projected mesh} if the test is successful, `false` otherwise.
 */
export const isProjectedMesh = (object: object): false | ProjectedMesh => {
  // an Object3D with a geometry and a material is definitely a projected mesh
  return 'geometry' in object && 'material' in object && object instanceof Object3D ? (object as ProjectedMesh) : false
}
