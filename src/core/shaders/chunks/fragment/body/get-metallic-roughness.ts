import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `metallic` (`f32`) and `roughness` (`f32`) values using the `material` binding `metallic`, `roughness` values and the metallic roughness texture if any.
 * @param parameters - Parameters used to create the chunk.
 * @param parameters.metallicRoughnessTexture - {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any.
 * @returns - A string with the `metallic` (`f32`) and `roughness` (`f32`) values set.
 */
export const getMetallicRoughness = ({
  metallicRoughnessTexture = null,
}: {
  metallicRoughnessTexture?: ShaderTextureDescriptor
} = {}): string => {
  let metallicRoughness = ''

  if (metallicRoughnessTexture) {
    metallicRoughness += getTextureSample(metallicRoughnessTexture, 'metallicRoughness')
    metallicRoughness += /* wgsl */ `
  metallic = metallic * metallicRoughnessSample.b;
  roughness = roughness * metallicRoughnessSample.g;
  `
  }

  metallicRoughness += /* wgsl */ `
  metallic = saturate(metallic);

  // roughness = clamp(roughness, 0.0525, 1.0);
  let dxy: vec3f = max( abs( dpdx( geometryNormal ) ), abs( dpdy( geometryNormal ) ) );
  let geometryRoughness: f32 = max( max( dxy.x, dxy.y ), dxy.z );
  roughness = max( roughness, 0.0525 );
  roughness += geometryRoughness;
  roughness = min( roughness, 1.0 );
  `

  return metallicRoughness
}
