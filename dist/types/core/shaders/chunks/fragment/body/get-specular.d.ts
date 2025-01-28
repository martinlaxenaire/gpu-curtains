import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-code';
export declare const getSpecular: ({ specularTexture, specularFactorTexture, specularColorTexture, }?: {
    specularTexture?: ShaderTextureDescriptor;
    specularFactorTexture?: ShaderTextureDescriptor;
    specularColorTexture?: ShaderTextureDescriptor;
}) => string;
