import { ToneMappings } from '../../../full/fragment/get-fragment-code';
export declare const applyToneMapping: ({ toneMapping }?: {
    toneMapping?: ToneMappings;
}) => "" | "outputColor = vec4(linearToOutput3(outputColor.rgb), outputColor.a);" | "outputColor = vec4(linearTosRGB(toneMapKhronosPbrNeutral(outputColor.rgb)), outputColor.a);";
