import { Texture } from '../../../textures/Texture';
/**
 * Compute a diffuse cube map texture from a specular cube map {@link Texture}.
 * @param cubemapTexture - Cube map {@link Texture} to use.
 */
export declare const computeDiffuseFromCubemap: (cubemapTexture: Texture) => string;
