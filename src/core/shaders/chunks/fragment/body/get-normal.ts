import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `normal` (`vec3f`) from `geometryNormal` (`vec3f`) or the a normal texture if it is set.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @returns - A string with the `normal` (`vec3f`) value set.
 */
export const getNormal = ({
  normalTexture = null,
}: {
  normalTexture?: ShaderTextureDescriptor
} = {}): string => {
  let normal = ''

  if (normalTexture) {
    normal += getTextureSample(normalTexture, 'normal')
    normal += /* wgsl */ `
  var mapN: vec3f = normalSample.rgb * 2.0 - 1.0;
  mapN = vec3(mapN.x * normalScale.x, mapN.y * normalScale.y, mapN.z);
  normal = normalize(tbn * mapN);
  `
  } else {
    normal += /* wgsl */ `
  normal = geometryNormal;`
  }

  return normal
}
