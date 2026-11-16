import { CameraRenderer } from '../../../../renderers/utils.js';
/**
 * Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link SpotLight}.
 * @param renderer - {@link CameraRenderer} used by the {@link SpotLight}.
 */
export declare const getPCFSpotShadows: (renderer: CameraRenderer) => string;
