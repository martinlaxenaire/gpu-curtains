import { Geometry } from '../../../../geometries/Geometry';
import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `normal` (`vec3f`), `geometryNormal` (`vec3f`), and eventually `tangent` (`vec3f`) and `bitangent` (`vec3f`) values if a normal texture is set.
 *
 * Tangent and bitangent are calculated using derivatives if the {@link Geometry} `tangent` and `bitangent` attributes are missing.
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.geometry - {@link Geometry} to use to check for `tangent` and `bitangent` attributes.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @returns - A string with the `normal` (`vec3f`), `geometryNormal` (`vec3f`), `tangent` (`vec3f`) and `bitangent` (`vec3f`) values set.
 */
export declare const getNormalTangentBitangent: ({ geometry, normalTexture, }?: {
    geometry?: Geometry;
    normalTexture?: ShaderTextureDescriptor;
}) => string;
