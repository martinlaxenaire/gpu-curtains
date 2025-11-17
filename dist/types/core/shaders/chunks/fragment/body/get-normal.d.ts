import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `normal` (`vec3f`) from `geometryNormal` (`vec3f`) or the a normal texture if it is set.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @returns - A string with the `normal` (`vec3f`) value set.
 */
export declare const getNormal: ({ normalTexture, }?: {
    normalTexture?: ShaderTextureDescriptor;
}) => string;
