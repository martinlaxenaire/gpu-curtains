import { CameraRenderer } from '../../../../renderers/utils';
/**
 * Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link PointLight}.
 * @param renderer - {@link CameraRenderer} used by the {@link PointLight}.
 */
export declare const getPCFPointShadows: (renderer: CameraRenderer) => string;
