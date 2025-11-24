import { getTextureSample } from './get-texture-sample.mjs';

const getMetallicRoughness = ({
  metallicRoughnessTexture = null
} = {}) => {
  let metallicRoughness = "";
  if (metallicRoughnessTexture) {
    metallicRoughness += getTextureSample(metallicRoughnessTexture, "metallicRoughness");
    metallicRoughness += /* wgsl */
    `
  metallic = metallic * metallicRoughnessSample.b;
  roughness = roughness * metallicRoughnessSample.g;
  `;
  }
  metallicRoughness += /* wgsl */
  `
  metallic = saturate(metallic);

  // roughness = clamp(roughness, 0.0525, 1.0);
  let dxy: vec3f = max( abs( dpdx( geometryNormal ) ), abs( dpdy( geometryNormal ) ) );
  let geometryRoughness: f32 = max( max( dxy.x, dxy.y ), dxy.z );
  roughness = max( roughness, 0.0525 );
  roughness += geometryRoughness;
  roughness = min( roughness, 1.0 );
  `;
  return metallicRoughness;
};

export { getMetallicRoughness };
