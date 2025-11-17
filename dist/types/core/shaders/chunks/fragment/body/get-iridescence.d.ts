import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `iridescence` (`f32`), `iridescenceThickness` (`f32`), `iridescenceF0` (`vec3f`) and `iridescenceFresnel` (`vec3f`) values.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if iridescence is enabled.
 * @param parameters.iridescenceTexture - {@link ShaderTextureDescriptor | Iridescence texture descriptor} (using the `R` channel for intensity and `G` channel for thickness) to use if any.
 * @param parameters.iridescenceFactorTexture - {@link ShaderTextureDescriptor | Iridescence factor texture descriptor} (using the `R` channel) to use if any.
 * @param parameters.iridescenceThicknessTexture - {@link ShaderTextureDescriptor | Iridescence thickness texture descriptor} (using the `G` channel) to use if any.
 */
export declare const getIridescence: ({ extensionsUsed, iridescenceTexture, iridescenceFactorTexture, iridescenceThicknessTexture, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
    iridescenceTexture?: ShaderTextureDescriptor;
    iridescenceFactorTexture?: ShaderTextureDescriptor;
    iridescenceThicknessTexture?: ShaderTextureDescriptor;
}) => string;
