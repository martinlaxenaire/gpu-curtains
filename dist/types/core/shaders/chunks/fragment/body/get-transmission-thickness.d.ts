import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-code';
export declare const getTransmissionThickness: ({ transmissionTexture, thicknessTexture, }?: {
    transmissionTexture?: ShaderTextureDescriptor;
    thicknessTexture?: ShaderTextureDescriptor;
}) => string;
