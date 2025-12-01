import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `singleVolumeScatter` (`vec3f`) value from the material volume scatter.
 *
 * @param parameters - Parameters used to set the `singleVolumeScatter` (`vec3f`) value.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if volume scatter transmission is enabled.
 * @returns - String with the `singleVolumeScatter` (`vec3f`) value set.
 */
export declare const getVolumeMultiScatter: ({ extensionsUsed, }: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}) => string;
