import { ColorSpace } from '../../../../../core/renderers/GPUCameraRenderer';
import { ToneMappings } from '../../../../../core/renderers/GPUCameraRenderer';
/**
 * Apply the corresponding tone mapping to our `outputColor` (`vec4f`).
 * @param parameters - Parameters to use for applying tone mapping.
 * @param parameters.toneMapping - {@link ToneMappings} to apply if any. Default to `'Khronos'`.
 */
export declare const applyToneMapping: ({ toneMapping, outputColorSpace, }?: {
    toneMapping?: ToneMappings;
    outputColorSpace?: ColorSpace;
}) => string;
