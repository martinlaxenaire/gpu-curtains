import { ShaderTextureDescriptor, FragmentShaderBaseInputParams } from '../../../full/fragment/get-fragment-code';
export declare const getPBRShading: ({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed, }?: {
    receiveShadows?: boolean;
    environmentMap?: FragmentShaderBaseInputParams['environmentMap'];
    transmissionBackgroundTexture?: ShaderTextureDescriptor;
    extensionsUsed?: FragmentShaderBaseInputParams['extensionsUsed'];
}) => string;
