import { Texture } from '../../../textures/Texture';
/**
 * Compute a diffuse cube map texture from a specular cube map {@link Texture}.
 * @param specularTexture - Specular cube map {@link Texture} to use.
 */
export declare const computeDiffuseFromSpecularCubemap: (specularTexture: Texture) => string;
