import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Helper to sample a texture with the corresponding UV and eventual transformation.
 *
 * @param texture - {@link ShaderTextureDescriptor | Texture descriptor} to use.
 * @param textureName - Name to use for the declared variables.
 * @returns - The sampled texture as `${textureName}Sample` (`vec4f`).
 */
export declare const getTextureSample: (texture: ShaderTextureDescriptor, textureName?: string) => string;
