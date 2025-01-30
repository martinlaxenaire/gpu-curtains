import { CameraRenderer } from '../../../../renderers/utils';
/**
 * Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link DirectionalLight}.
 * @param renderer - {@link CameraRenderer} used by the {@link DirectionalLight}.
 */
export declare const getPCFDirectionalShadows: (renderer: CameraRenderer) => string;
