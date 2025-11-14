import { Geometry } from '../../../../geometries/Geometry'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `normal` (`vec3f`), `geometryNormal` (`vec3f`), and eventually `tangent` (`vec3f`) and `bitangent` (`vec3f`) values if a normal texture is set.
 *
 * Tangent and bitangent are calculated using derivatives if the {@link Geometry} `tangent` and `bitangent` attributes are missing.
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.geometry - {@link Geometry} to use to check for `tangent` and `bitangent` attributes.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @returns - A string with the `normal` (`vec3f`), `geometryNormal` (`vec3f`), `tangent` (`vec3f`) and `bitangent` (`vec3f`) values set.
 */
export const getNormalTangentBitangent = ({
  geometry = null,
  normalTexture = null,
}: {
  geometry?: Geometry
  normalTexture?: ShaderTextureDescriptor
} = {}): string => {
  let normalTangentBitangent = /* wgsl */ `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;`

  const tangentAttribute = geometry && geometry.getAttributeByName('tangent')
  const hasTangent = !!(normalTexture && tangentAttribute)

  if (normalTexture) {
    normalTangentBitangent += getTextureSample(normalTexture, 'normal')

    if (!hasTangent) {
      normalTangentBitangent += /* wgsl */ `
  let tbn = generateTBN(geometryNormal);`
    } else {
      normalTangentBitangent += /* wgsl */ `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);`
    }

    normalTangentBitangent += /* wgsl */ `
  normal = normalize(tbn * (2.0 * normalSample.rgb - vec3(vec2(normalScale), 1.0)));`
  } else {
    normalTangentBitangent += /* wgsl */ `
  normal = geometryNormal;`
  }

  return normalTangentBitangent
}
