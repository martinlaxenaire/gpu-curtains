import { ToneMappings } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Apply the corresponding tone mapping to our `outputColor` (`vec4f`).
 * @param parameters - Parameters to use for applying tone mapping.
 * @param parameters.toneMapping - {@link ToneMappings} to apply if any. Default to `'Linear'`.
 */
export declare const applyToneMapping: ({ toneMapping }?: {
    toneMapping?: ToneMappings;
}) => "" | "outputColor = vec4(linearToOutput3(outputColor.rgb), outputColor.a);" | "outputColor = vec4(linearTosRGB(toneMapKhronosPbrNeutral(outputColor.rgb)), outputColor.a);";
