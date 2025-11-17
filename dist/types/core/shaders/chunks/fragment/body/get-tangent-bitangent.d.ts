import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { Geometry } from '../../../../geometries/Geometry';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `geometryNormal` (`vec3f`) and eventually `tangent` (`vec3f`) and `bitangent` (`vec3f`) values if a normal texture, clearcoat normal texture is set, or if anisotropy extension is enabled.
 *
 * Tangent and bitangent are calculated using derivatives if the {@link Geometry} `tangent` and `bitangent` attributes are missing.
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @param parameters.geometry - {@link Geometry} to use to check for `tangent` and `bitangent` attributes.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @param parameters.clearcoatNormalTexture - {@link ShaderTextureDescriptor | Clearcoat normal texture descriptor} to use if any.
 */
export declare const getTangentBitangent: ({ extensionsUsed, geometry, normalTexture, clearcoatNormalTexture, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
    geometry?: Geometry;
    normalTexture?: ShaderTextureDescriptor;
    clearcoatNormalTexture?: ShaderTextureDescriptor;
}) => string;
